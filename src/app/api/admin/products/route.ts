import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";

function isAllowed(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("MANAGER") || roles.includes("STAFF");
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`admin_products_post:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const base_price = Number(body.base_price);
  const discounted_price = body.discounted_price ? Number(body.discounted_price) : null;
  const sku = body.sku ? String(body.sku).trim() : null;
  const description = body.description ? String(body.description) : null;
  const short_description = body.short_description ? String(body.short_description) : null;
  const is_active = Boolean(body.is_active);
  const age_group = body.age_group ? String(body.age_group).trim() : null;
  const category_id = body.category_id ? String(body.category_id) : null;
  const brand_id = body.brand_id ? String(body.brand_id) : null;
  const available_quantity = body.available_quantity !== undefined ? Math.max(0, Number(body.available_quantity)) : 0;
  const low_stock_threshold = body.low_stock_threshold !== undefined ? Math.max(0, Number(body.low_stock_threshold)) : 5;

  if (!name || !slug || !Number.isFinite(base_price)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const created = await prisma.products.create({
    data: {
      name,
      slug,
      base_price,
      discounted_price,
      sku,
      description,
      short_description,
      is_active,
      age_group,
      category_id,
      brand_id,
    },
    select: { id: true },
  });

  await prisma.inventory.create({
    data: {
      product_id: created.id,
      product_variant_id: null,
      available_quantity,
      reserved_quantity: 0,
      sold_quantity: 0,
      low_stock_threshold,
    },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

