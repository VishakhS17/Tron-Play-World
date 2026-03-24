import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail, orderEmailTemplate } from "@/lib/email";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";
import { createOrderAccessToken } from "@/lib/security/orderAccess";
import { validateCommonEmailProvider } from "@/lib/validateEmai";
import bcrypt from "bcrypt";
import {
  cleanOptionalText,
  cleanText,
  hasSuspiciousInput,
  normalizeEmail,
  normalizePhone,
  readJsonBody,
  isUuid,
} from "@/lib/validation/input";

type CheckoutItem = {
  productId: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`checkout:${req.ip ?? "unknown"}`, 1);
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

  const items = (Array.isArray(body.items) ? body.items : []) as CheckoutItem[];
  const address = (body.address ?? {}) as Record<string, unknown>;
  const isGift = Boolean(body.isGift);
  const giftMessage = cleanOptionalText(body.giftMessage, 500);
  const couponCode = cleanText(body.couponCode, 80);

  if (items.length === 0) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const full_name = cleanText(address.full_name, 150);
  const phone = normalizePhone(address.phone);
  const email = normalizeEmail(address.email);
  const line1 = cleanText(address.line1, 255);
  const city = cleanText(address.city, 120);
  const state = cleanText(address.state, 120);
  const postal_code = cleanText(address.postal_code, 20);
  const country = cleanText(address.country ?? "India", 80);

  if (!full_name || !phone || !email || !line1 || !city || !state || !postal_code || !country) {
    return NextResponse.json({ error: "Address is incomplete" }, { status: 400 });
  }
  if (!validateCommonEmailProvider(email)) {
    return NextResponse.json(
      { error: "Use a common email provider (Gmail, Yahoo, Outlook, etc.)" },
      { status: 400 }
    );
  }
  if (
    [full_name, phone, email, line1, city, state, postal_code, country, couponCode]
      .filter(Boolean)
      .some((v) => hasSuspiciousInput(v))
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const dbProducts = await prisma.products.findMany({
    where: { id: { in: productIds }, is_active: true },
    select: { id: true, name: true, sku: true, base_price: true, discounted_price: true },
  });
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  for (const item of items) {
    if (!isUuid(String(item.productId ?? ""))) {
      return NextResponse.json({ error: "One or more items are invalid" }, { status: 400 });
    }
    if (!productMap.has(item.productId)) {
      return NextResponse.json({ error: "One or more items are invalid" }, { status: 400 });
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
  }

  let checkoutUserId = session?.sub ?? null;
  let checkoutEmail = session?.email ?? email;
  if (!checkoutUserId) {
    const existingUser = await prisma.customers.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (existingUser) {
      checkoutUserId = existingUser.id;
      checkoutEmail = existingUser.email;
    } else {
      const randomPasswordHash = await bcrypt.hash(
        `${email}:${Date.now()}:${Math.random()}`,
        12
      );
      const createdUser = await prisma.customers.create({
        data: {
          email,
          password_hash: randomPasswordHash,
          name: full_name || null,
          phone: phone || null,
          is_active: true,
        },
        select: { id: true, email: true },
      });
      checkoutUserId = createdUser.id;
      checkoutEmail = createdUser.email;
    }
  }

  const coupon = couponCode
    ? await prisma.coupons.findFirst({
        where: { code: couponCode, is_active: true },
        select: {
          id: true,
          discount_type: true,
          discount_value: true,
          min_cart_value: true,
          starts_at: true,
          ends_at: true,
          max_uses: true,
          max_uses_per_user: true,
        },
      })
    : null;

  const lineItems = items.map((i) => {
    const p = productMap.get(i.productId)!;
    const unit = Number(p.discounted_price ?? p.base_price);
    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku ?? null,
      unitPrice: unit,
      quantity: i.quantity,
      subtotal: unit * i.quantity,
    };
  });

  const subtotal = lineItems.reduce((s, li) => s + li.subtotal, 0);
  let discount = 0;
  if (coupon) {
    const now = new Date();
    if (coupon.starts_at && coupon.starts_at > now) {
      return NextResponse.json({ error: "Coupon is not active yet" }, { status: 400 });
    }
    if (coupon.ends_at && coupon.ends_at < now) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }
    const minOk = coupon.min_cart_value ? subtotal >= Number(coupon.min_cart_value) : true;
    if (!minOk) return NextResponse.json({ error: "Coupon minimum not met" }, { status: 400 });

    if (coupon.max_uses) {
      const used = await prisma.coupon_usages.count({ where: { coupon_id: coupon.id } });
      if (used >= coupon.max_uses) {
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      }
    }
    if (coupon.max_uses_per_user && session?.sub) {
      const usedByUser = await prisma.coupon_usages.count({
        where: { coupon_id: coupon.id, customer_id: session.sub },
      });
      if (usedByUser >= coupon.max_uses_per_user) {
        return NextResponse.json(
          { error: "Coupon usage limit reached for your account" },
          { status: 400 }
        );
      }
    }

    if (coupon.discount_type === "PERCENTAGE") {
      discount = Math.round((subtotal * Number(coupon.discount_value)) / 100);
    } else {
      discount = Math.min(subtotal, Number(coupon.discount_value));
    }
  }
  const total = Math.max(0, subtotal - discount);

  // Transaction: create address, order, items, reserve inventory.
  const order = await prisma.$transaction(async (tx) => {
    const addr = await tx.addresses.create({
      data: {
        customer_id: checkoutUserId,
        full_name,
        phone,
        line1,
        line2: address?.line2 ? String(address.line2) : null,
        city,
        state,
        postal_code,
        country,
        is_default_billing: false,
        is_default_shipping: false,
      },
      select: { id: true },
    });

    const createdOrder = await tx.orders.create({
      data: {
        customer_id: checkoutUserId,
        status: "PENDING",
        payment_status: "PENDING",
        subtotal_amount: subtotal,
        discount_amount: discount,
        shipping_amount: subtotal >= 2000 ? 0 : 99,
        tax_amount: 0,
        total_amount: Math.max(0, total + (subtotal >= 2000 ? 0 : 99)),
        currency: "INR",
        coupon_id: coupon?.id ?? null,
        shipping_address_id: addr.id,
        billing_address_id: addr.id,
        payment_provider: "placeholder",
        is_gift: isGift,
        gift_message: giftMessage,
      },
      select: { id: true },
    });

    for (const li of lineItems) {
      const oi = await tx.order_items.create({
        data: {
          order_id: createdOrder.id,
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

      // Reserve stock (product-level inventory row where variant is null)
      const updated = await tx.inventory.updateMany({
        where: {
          product_id: li.productId,
          product_variant_id: null,
          available_quantity: { gte: li.quantity },
        },
        data: {
          available_quantity: { decrement: li.quantity },
          reserved_quantity: { increment: li.quantity },
        },
      });
      if (updated.count !== 1) {
        throw new Error("OUT_OF_STOCK");
      }

      await tx.inventory_reservations.create({
        data: {
          order_id: createdOrder.id,
          order_item_id: oi.id,
          product_id: li.productId,
          product_variant_id: null,
          quantity: li.quantity,
        },
      });
    }

    return createdOrder;
  });

  await writeAuditLog({
    customerId: session?.sub ?? null,
    entityType: "ORDER",
    entityId: order.id,
    action: "ORDER_CREATED_PENDING",
    newValues: { status: "PENDING" },
    ipAddress: req.ip ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  if (checkoutEmail) {
    await sendEmail({
      to: checkoutEmail,
      subject: "Order created (pending payment)",
      html: orderEmailTemplate({
        heading: "We received your order",
        message:
          "Your order has been created in a pending state. Please complete payment to confirm it.",
        orderId: order.id,
      }),
    });
  }

  const accessToken = createOrderAccessToken(order.id);
  return NextResponse.json({ ok: true, orderId: order.id, accessToken }, { status: 201 });
}

