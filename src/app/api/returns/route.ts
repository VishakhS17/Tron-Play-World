import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`returns:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const orderId = String(body.orderId ?? "");
  const orderItemId = String(body.orderItemId ?? "");
  const quantity = Number(body.quantity ?? 0);
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : null;

  if (!orderId || !orderItemId || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    select: { id: true, user_id: true, status: true },
  });
  if (!order || order.user_id !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.order_items.findUnique({
    where: { id: orderItemId },
    select: { id: true, order_id: true, quantity: true },
  });
  if (!item || item.order_id !== orderId) {
    return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  }
  if (quantity > item.quantity) {
    return NextResponse.json({ error: "Return quantity exceeds purchased quantity" }, { status: 400 });
  }

  const ret = await prisma.returns.create({
    data: {
      order_id: orderId,
      order_item_id: orderItemId,
      user_id: session.sub,
      quantity,
      reason,
      status: "REQUESTED",
    },
    select: { id: true },
  });

  await writeAuditLog({
    userId: session.sub,
    entityType: "RETURN",
    entityId: ret.id,
    action: "RETURN_REQUESTED",
    newValues: { orderId, orderItemId, quantity },
    ipAddress: req.ip ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, returnId: ret.id }, { status: 201 });
}

