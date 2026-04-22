import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { createOrderAccessToken } from "@/lib/security/orderAccess";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";
import { cleanText, readJsonBody } from "@/lib/validation/input";
import { buildCheckoutContext } from "@/lib/checkout/buildCheckoutContext";
import { getRazorpayClient, verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";
import { syncLowStockAlertsByProductIds } from "@/lib/inventory/lowStockAlerts";
import {
  sendEmail,
  orderConfirmedCustomerEmailHtml,
  orderConfirmedCustomerEmailText,
} from "@/lib/email";
import { bookShipmentForOrder } from "@/lib/shipping";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`rzp_verify:${req.ip ?? "unknown"}`, 2);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body as Record<string, unknown>;

  const razorpayOrderId = cleanText(body.razorpayOrderId, 120);
  const razorpayPaymentId = cleanText(body.razorpayPaymentId, 120);
  const razorpaySignature = cleanText(body.razorpaySignature, 255);

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json({ error: "Payment verification data is incomplete" }, { status: 400 });
  }

  const validSig = verifyRazorpayPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  if (!validSig) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const session = await getSession();
  try {
    const razorpay = getRazorpayClient();
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (payment.order_id !== razorpayOrderId) {
      return NextResponse.json({ error: "Payment/order mismatch" }, { status: 400 });
    }
    if (payment.status !== "captured" && payment.status !== "authorized") {
      return NextResponse.json({ error: "Payment is not successful" }, { status: 400 });
    }

    const existing = await prisma.orders.findFirst({
      where: { external_payment_id: razorpayPaymentId, payment_provider: "razorpay" },
      select: { id: true },
    });
    if (existing) {
      const accessToken = createOrderAccessToken(existing.id);
      return NextResponse.json(
        { ok: true, orderId: existing.id, accessToken, alreadyProcessed: true },
        { status: 200 }
      );
    }

    const ctx = await buildCheckoutContext({ body, session });
    const expectedAmountPaise = Math.round(ctx.total * 100);
    if (Number(payment.amount) !== expectedAmountPaise) {
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const addr = await tx.addresses.create({
        data: {
          customer_id: ctx.checkoutUserId,
          full_name: ctx.address.full_name,
          phone: ctx.address.phone,
          line1: ctx.address.line1,
          line2: ctx.address.line2,
          city: ctx.address.city,
          state: ctx.address.state,
          postal_code: ctx.address.postal_code,
          country: ctx.address.country,
          is_default_billing: false,
          is_default_shipping: false,
        },
        select: { id: true },
      });

      const order = await tx.orders.create({
        data: {
          customer_id: ctx.checkoutUserId,
          status: "CONFIRMED",
          payment_status: "SUCCEEDED",
          subtotal_amount: ctx.subtotal,
          discount_amount: ctx.discount,
          shipping_amount: ctx.shipping,
          tax_amount: 0,
          total_amount: ctx.total,
          currency: "INR",
          coupon_id: ctx.coupon?.id ?? null,
          shipping_address_id: addr.id,
          billing_address_id: addr.id,
          payment_provider: "razorpay",
          external_payment_id: razorpayPaymentId,
          is_gift: ctx.isGift,
          gift_message: ctx.giftMessage,
        },
        select: { id: true, customer_id: true },
      });

      for (const li of ctx.lineItems) {
        const oi = await tx.order_items.create({
          data: {
            order_id: order.id,
            product_id: li.productId,
            product_variant_id: null,
            product_name: li.productName,
            sku: li.sku,
            unit_price: li.unitPrice,
            quantity: li.quantity,
            subtotal_amount: li.subtotal,
          },
          select: { id: true },
        });

        const updated = await tx.inventory.updateMany({
          where: {
            product_id: li.productId,
            product_variant_id: null,
            available_quantity: { gte: li.quantity },
          },
          data: {
            available_quantity: { decrement: li.quantity },
            sold_quantity: { increment: li.quantity },
          },
        });
        if (updated.count !== 1) throw new Error("OUT_OF_STOCK");

        await tx.inventory_reservations.create({
          data: {
            order_id: order.id,
            order_item_id: oi.id,
            product_id: li.productId,
            product_variant_id: null,
            quantity: li.quantity,
            released_at: new Date(),
          },
        });
      }

      await tx.shipments.upsert({
        where: { order_id: order.id },
        update: { status: "CREATED" },
        create: {
          order_id: order.id,
          status: "CREATED",
          tracking_number: null,
          carrier: null,
        },
      });

      if (ctx.coupon?.id) {
        await tx.coupon_usages.create({
          data: {
            coupon_id: ctx.coupon.id,
            customer_id: order.customer_id ?? null,
            order_id: order.id,
          },
        });
      }

      return order;
    });

    await syncLowStockAlertsByProductIds(ctx.lineItems.map((li) => li.productId)).catch((err) => {
      console.error("[payment/razorpay/verify] low stock alert sync failed", err);
    });

    try {
      await bookShipmentForOrder(created.id);
    } catch (delErr) {
      console.error("[payment/razorpay/verify] shipment booking failed", delErr);
    }

    await writeAuditLog({
      customerId: ctx.checkoutUserId,
      entityType: "ORDER",
      entityId: created.id,
      action: "PAYMENT_CONFIRMED",
      newValues: { status: "CONFIRMED", paymentProvider: "razorpay" },
      ipAddress: req.ip ?? null,
      userAgent: req.headers.get("user-agent"),
    });

    if (ctx.checkoutEmail) {
      try {
        const passwordSetup = ctx.newAccountPasswordSetup
          ? { email: ctx.checkoutEmail, setupUrl: ctx.newAccountPasswordSetup.setupUrl }
          : undefined;
        await sendEmail({
          to: ctx.checkoutEmail,
          subject: ctx.newAccountPasswordSetup
            ? "Order placed — set your password (see email)"
            : "Order placed successfully",
          html: orderConfirmedCustomerEmailHtml({
            orderId: created.id,
            passwordSetup,
          }),
          text: orderConfirmedCustomerEmailText({
            orderId: created.id,
            passwordSetup,
          }),
        });
      } catch (err) {
        console.error("[payment/razorpay/verify] order email failed", err);
      }
    }

    const accessToken = createOrderAccessToken(created.id);
    return NextResponse.json(
      {
        ok: true,
        orderId: created.id,
        accessToken,
        checkoutLinkedAs: ctx.checkoutLinkedAs,
        passwordSetupIncluded: Boolean(ctx.newAccountPasswordSetup),
        newAccountCreated: ctx.checkoutLinkedAs === "new_customer",
      },
      { status: 201 }
    );
  } catch (e: any) {
    if (String(e?.message ?? "") === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "Item went out of stock while paying" }, { status: 409 });
    }
    const msg = String(e?.message ?? "");
    if (msg.startsWith("MAX_ORDER_QTY_EXCEEDED:")) {
      const [, productName, maxRaw] = msg.split(":");
      const maxQty = Number(maxRaw);
      return NextResponse.json(
        {
          error: Number.isFinite(maxQty)
            ? `${productName || "This item"} allows max ${maxQty} per order`
            : "One or more items exceed the per-order quantity limit",
        },
        { status: 400 }
      );
    }
    const message = msg || "Could not verify payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
