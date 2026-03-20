import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail, orderEmailTemplate } from "@/lib/email";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";
import { verifyOrderAccessToken } from "@/lib/security/orderAccess";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`payment_fail:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getSession();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const orderId = String(body.orderId ?? "");
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        select: { id: true, user_id: true, payment_status: true },
      });
      if (!order) throw new Error("NOT_FOUND");
      const isOwner = Boolean(session?.sub && order.user_id && order.user_id === session.sub);
      const hasGuestAccess =
        !order.user_id && accessToken && verifyOrderAccessToken(accessToken, orderId);
      if (!isOwner && !hasGuestAccess) throw new Error("FORBIDDEN");
      if (order.payment_status === "FAILED") return;

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
          available_quantity: { increment: r.quantity },
        },
      });
      await tx.inventory_reservations.update({
        where: { id: r.id },
        data: { released_at: new Date() },
      });
    }

      await tx.orders.update({
        where: { id: orderId },
        data: { payment_status: "FAILED", status: "PAYMENT_FAILED" },
      });
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
    userId: session?.sub ?? null,
    entityType: "ORDER",
    entityId: orderId,
    action: "PAYMENT_FAILED",
    newValues: { status: "PAYMENT_FAILED" },
    ipAddress: req.ip ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  if (session?.email) {
    await sendEmail({
      to: session.email,
      subject: "Payment failed — order not confirmed",
      html: orderEmailTemplate({
        heading: "Payment failed",
        message:
          "Your payment was not successful. The order has been marked as failed and reserved stock has been released.",
        orderId,
      }),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

