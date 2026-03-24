import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail, orderEmailTemplate } from "@/lib/email";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";
import { verifyOrderAccessToken } from "@/lib/security/orderAccess";
import { cleanText, isUuid, readJsonBody } from "@/lib/validation/input";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`payment_confirm:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getSession();
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body;
  const orderId = cleanText(body.orderId, 64);
  const accessToken = cleanText(body.accessToken, 512);
  if (!orderId || !isUuid(orderId)) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  let result: { id: string; already: boolean };
  try {
    // Confirm payment server-side: confirm order, deduct reserved stock, create shipment.
    result = await prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        select: { id: true, customer_id: true, status: true, payment_status: true, coupon_id: true },
      });
      if (!order) throw new Error("NOT_FOUND");
      const isOwner = Boolean(session?.sub && order.customer_id && order.customer_id === session.sub);
      const hasGuestAccess =
        !order.customer_id && accessToken && verifyOrderAccessToken(accessToken, orderId);
      if (!isOwner && !hasGuestAccess) throw new Error("FORBIDDEN");
      if (order.payment_status === "SUCCEEDED") return { id: order.id, already: true };

    const reservations = await tx.inventory_reservations.findMany({
      where: { order_id: orderId, released_at: null },
      select: { id: true, product_id: true, product_variant_id: true, quantity: true },
    });

    for (const r of reservations) {
      await tx.inventory.updateMany({
        where: {
          product_id: r.product_id,
          product_variant_id: r.product_variant_id,
          reserved_quantity: { gte: r.quantity },
        },
        data: {
          reserved_quantity: { decrement: r.quantity },
          sold_quantity: { increment: r.quantity },
        },
      });
      await tx.inventory_reservations.update({
        where: { id: r.id },
        data: { released_at: new Date() },
      });
    }

    await tx.orders.update({
      where: { id: orderId },
      data: {
        payment_status: "SUCCEEDED",
        status: "CONFIRMED",
        external_payment_id: `placeholder_${Date.now()}`,
      },
    });

    await tx.shipments.upsert({
      where: { order_id: orderId },
      update: { status: "CREATED" },
      create: {
        order_id: orderId,
        status: "CREATED",
        tracking_number: null,
        carrier: null,
      },
    });

    if (order.coupon_id) {
      await tx.coupon_usages.create({
        data: {
          coupon_id: order.coupon_id,
          customer_id: order.customer_id ?? null,
          order_id: orderId,
        },
      });
    }

      return { id: orderId, already: false };
    });
  } catch (e: any) {
    if (e?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    throw e;
  }

  await writeAuditLog({
    customerId: session?.sub ?? null,
    entityType: "ORDER",
    entityId: orderId,
    action: "PAYMENT_CONFIRMED",
    newValues: { status: "CONFIRMED" },
    ipAddress: req.ip ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  if (session?.email) {
    await sendEmail({
      to: session.email,
      subject: "Payment successful — order confirmed",
      html: orderEmailTemplate({
        heading: "Payment successful",
        message:
          "Your payment has been confirmed by our server. Your order is now confirmed and will be prepared for shipment.",
        orderId,
      }),
    });
  }

  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}

