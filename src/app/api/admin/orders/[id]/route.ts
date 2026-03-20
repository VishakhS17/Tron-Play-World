import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { requireAdmin } from "@/lib/admin/rbac";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const order = await prisma.orders.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      user_id: true,
      users: { select: { email: true } },
      shipments: { select: { id: true, carrier: true, tracking_number: true, status: true } },
      order_items: { select: { id: true, product_name: true, quantity: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    {
      id: order.id,
      status: String(order.status),
      customer: order.users?.email ?? order.user_id ?? null,
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
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const status = typeof body.status === "string" ? body.status : null;
  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });

  await prisma.orders.update({ where: { id }, data: { status: status as any } });

  if (body.shipment) {
    const carrier = typeof body.shipment.carrier === "string" ? body.shipment.carrier : null;
    const tracking_number =
      typeof body.shipment.tracking_number === "string" ? body.shipment.tracking_number : null;

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

