import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { requireAdminWrite } from "@/lib/admin/rbac";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";

function parseCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: any = {};
    header.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`admin_csv_products_post:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await requireAdminWrite();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.csv) return NextResponse.json({ error: "csv is required" }, { status: 400 });

  const rows = parseCsv(String(body.csv));
  let count = 0;

  for (const r of rows) {
    const name = String(r.name ?? "").trim();
    const slug = String(r.slug ?? "").trim();
    const base_price = Number(r.base_price);
    const discounted_price = r.discounted_price ? Number(r.discounted_price) : null;
    const sku = r.sku ? String(r.sku).trim() : null;
    const is_active = String(r.is_active ?? "true").toLowerCase() !== "false";
    if (!name || !slug || !Number.isFinite(base_price)) continue;

    const created = await prisma.products.upsert({
      where: { slug },
      update: { name, base_price, discounted_price, sku, is_active },
      create: { name, slug, base_price, discounted_price, sku, is_active },
      select: { id: true },
    });

    await prisma.inventory.upsert({
      where: { product_id_product_variant_id: { product_id: created.id, product_variant_id: null } } as any,
      update: {},
      create: {
        product_id: created.id,
        product_variant_id: null,
        available_quantity: 0,
        reserved_quantity: 0,
        sold_quantity: 0,
        low_stock_threshold: 0,
      },
    });

    count++;
  }

  return NextResponse.json({ ok: true, count }, { status: 200 });
}

