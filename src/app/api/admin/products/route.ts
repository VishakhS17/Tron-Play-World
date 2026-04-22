import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getAdminSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { cleanOptionalText, cleanText, hasSuspiciousInput, isUuid, readJsonBody } from "@/lib/validation/input";
import { syncLowStockAlertsByProductIds } from "@/lib/inventory/lowStockAlerts";

function isAllowed(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("MANAGER") || roles.includes("STAFF");
}

function parseShippingPerUnitIn(body: Record<string, unknown>): number | { error: string } {
  if (body.shipping_per_unit === undefined || body.shipping_per_unit === null || body.shipping_per_unit === "") {
    return 0;
  }
  const n = Number(body.shipping_per_unit);
  if (!Number.isFinite(n) || n < 0 || n > 50_000) return { error: "Invalid shipping_per_unit" };
  return Math.round(n * 100) / 100;
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

  const session = await getAdminSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body;

  const name = cleanText(body.name, 255);
  const slug = cleanText(body.slug, 255);
  const base_price = Number(body.base_price);
  const discounted_price = body.discounted_price ? Number(body.discounted_price) : null;
  const sku = cleanOptionalText(body.sku, 100);
  const description = cleanOptionalText(body.description, 10000);
  const short_description = cleanOptionalText(body.short_description, 2000);
  const is_active = Boolean(body.is_active);
  const age_group = cleanOptionalText(body.age_group, 50);
  const diecast_scale_id = cleanOptionalText(body.diecast_scale_id, 64);
  const category_id = cleanOptionalText(body.category_id, 64);
  const brand_id = cleanOptionalText(body.brand_id, 64);
  let hsn_code: string | null = null;
  if (body.hsn_code !== undefined && body.hsn_code !== null && body.hsn_code !== "") {
    if (typeof body.hsn_code !== "string") {
      return NextResponse.json({ error: "Invalid hsn_code" }, { status: 400 });
    }
    const h = body.hsn_code.replace(/\s/g, "").replace(/[^0-9,]/g, "").slice(0, 32);
    hsn_code = h || null;
  }
  const available_quantity = body.available_quantity !== undefined ? Math.max(0, Number(body.available_quantity)) : 0;
  const low_stock_threshold = body.low_stock_threshold !== undefined ? Math.max(0, Number(body.low_stock_threshold)) : 5;
  const shippingParsed = parseShippingPerUnitIn(body as Record<string, unknown>);
  if (typeof shippingParsed === "object") {
    return NextResponse.json({ error: shippingParsed.error }, { status: 400 });
  }

  if (!name || !slug || !Number.isFinite(base_price)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (
    [name, slug, sku ?? "", age_group ?? "", description ?? "", short_description ?? ""].some((v) =>
      hasSuspiciousInput(v)
    )
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (
    (category_id && !isUuid(category_id)) ||
    (brand_id && !isUuid(brand_id)) ||
    (diecast_scale_id && !isUuid(diecast_scale_id))
  ) {
    return NextResponse.json({ error: "Invalid relations" }, { status: 400 });
  }

  const created = await prisma.products.create({
    data: {
      name,
      slug,
      base_price,
      discounted_price,
      shipping_per_unit: shippingParsed,
      sku,
      hsn_code,
      diecast_scale_id,
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

  await syncLowStockAlertsByProductIds([created.id]).catch((err) => {
    console.error("[admin products POST] low stock alert sync failed", err);
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

