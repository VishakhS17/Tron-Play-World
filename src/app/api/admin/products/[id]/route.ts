import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getAdminSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { cleanText, isUuid, readJsonBody } from "@/lib/validation/input";

function isAllowed(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("MANAGER") || roles.includes("STAFF");
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || !isAllowed(session.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const product = await prisma.products.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      base_price: true,
      discounted_price: true,
      sku: true,
      description: true,
      short_description: true,
      is_active: true,
      age_group: true,
      category_id: true,
      brand_id: true,
      product_images: {
        orderBy: { sort_order: "asc" },
        select: { id: true, url: true, alt_text: true, sort_order: true },
      },
      inventory: {
        take: 1,
        where: { product_variant_id: null },
        select: { id: true, available_quantity: true, low_stock_threshold: true },
      },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inv = product.inventory[0] ?? null;
  return NextResponse.json({
    ...product,
    inventory: undefined,
    inventoryId: inv?.id ?? null,
    available_quantity: inv?.available_quantity ?? 0,
    low_stock_threshold: inv?.low_stock_threshold ?? 5,
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`admin_products_put:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getAdminSession();
  if (!session || !isAllowed(session.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body;

  const updated = await prisma.products.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      sku: typeof body.sku === "string" ? body.sku : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      short_description: typeof body.short_description === "string" ? body.short_description : undefined,
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
      age_group: body.age_group !== undefined ? (body.age_group || null) : undefined,
      category_id: body.category_id !== undefined ? (body.category_id || null) : undefined,
      brand_id: body.brand_id !== undefined ? (body.brand_id || null) : undefined,
      base_price: body.base_price !== undefined ? Number(body.base_price) : undefined,
      discounted_price:
        body.discounted_price !== undefined && body.discounted_price !== ""
          ? Number(body.discounted_price)
          : null,
    },
    select: { id: true },
  });

  // Update inventory row if quantity fields were sent
  const hasQty = body.available_quantity !== undefined || body.low_stock_threshold !== undefined;
  if (hasQty) {
    const inv = await prisma.inventory.findFirst({
      where: { product_id: id, product_variant_id: null },
      select: { id: true },
    });
    const data: Record<string, number> = {};
    if (body.available_quantity !== undefined) data.available_quantity = Math.max(0, Number(body.available_quantity));
    if (body.low_stock_threshold !== undefined) data.low_stock_threshold = Math.max(0, Number(body.low_stock_threshold));

    if (inv) {
      await prisma.inventory.update({ where: { id: inv.id }, data });
    } else {
      await prisma.inventory.create({
        data: {
          product_id: id,
          product_variant_id: null,
          available_quantity: data.available_quantity ?? 0,
          reserved_quantity: 0,
          sold_quantity: 0,
          low_stock_threshold: data.low_stock_threshold ?? 5,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, id: updated.id }, { status: 200 });
}
