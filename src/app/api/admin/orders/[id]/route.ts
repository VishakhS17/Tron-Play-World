import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { requireAdmin } from "@/lib/admin/rbac";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import {
  cleanText,
  hasSuspiciousInput,
  isAllowedOrderStatus,
  isUuid,
  readJsonBody,
} from "@/lib/validation/input";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const order = await prisma.orders.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      customer_id: true,
      customers: { select: { email: true } },
      shipments: { select: { id: true, carrier: true, tracking_number: true, status: true } },
      order_items: { select: { id: true, product_name: true, quantity: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    {
      id: order.id,
      status: String(order.status),
      customer: order.customers?.email ?? order.customer_id ?? null,
      shipment: order.shipments
        ? {
            id: order.shipments.id,
            carrier: order.shipments.carrier ?? "",
            tracking_number: order.shipments.tracking_number ?? "",
            status: String(order.shipments.status),
          }
        : { id: null, carrier: "", tracking_number: "", status: "PENDING" },
      items: order.order_items,
    },
    { status: 200 }
  );
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`admin_orders_put:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body;

  const status = typeof body.status === "string" ? cleanText(body.status, 40) : null;
  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }
  if (!isAllowedOrderStatus(status)) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
  }

  await prisma.orders.update({ where: { id }, data: { status: status as any } });

  const shipment = body.shipment;
  if (shipment && typeof shipment === "object" && !Array.isArray(shipment)) {
    const s = shipment as Record<string, unknown>;
    const carrierRaw = typeof s.carrier === "string" ? s.carrier : null;
    const trackingRaw = typeof s.tracking_number === "string" ? s.tracking_number : null;
    const carrier = carrierRaw !== null ? cleanText(carrierRaw, 120) : null;
    const tracking_number = trackingRaw !== null ? cleanText(trackingRaw, 255) : null;
    if ((carrier && hasSuspiciousInput(carrier)) || (tracking_number && hasSuspiciousInput(tracking_number))) {
      return NextResponse.json({ error: "Invalid shipment fields" }, { status: 400 });
    }

    await prisma.shipments.upsert({
      where: { order_id: id },
      update: { carrier, tracking_number },
      create: {
        order_id: id,
        status: "CREATED",
        carrier,
        tracking_number,
      },
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

