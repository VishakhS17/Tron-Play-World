import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";

function toInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();
  const brand = (url.searchParams.get("brand") ?? "").trim();
  const ageGroup = (url.searchParams.get("ageGroup") ?? "").trim();
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const availableOnly = (url.searchParams.get("available") ?? "").trim() === "true";

  const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
  const pageSize = Math.min(24, Math.max(6, toInt(url.searchParams.get("pageSize"), 12)));
  const skip = (page - 1) * pageSize;

  const where: any = { is_active: true };
  if (q) {
    // Basic fallback search without tsvector (Prisma doesn't support tsvector fields).
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { short_description: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }
  if (ageGroup) where.age_group = ageGroup;
  if (minPrice || maxPrice) {
    where.base_price = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }
  if (category) where.categories = { slug: category };
  if (brand) where.brands = { slug: brand };

  // Availability filter: requires inventory row with available_quantity > 0 for product-level inventory.
  if (availableOnly) {
    where.inventory = { some: { available_quantity: { gt: 0 } } };
  }

  const [total, products] = await Promise.all([
    prisma.products.count({ where }),
    prisma.products.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        short_description: true,
        description: true,
        base_price: true,
        discounted_price: true,
        slug: true,
        updated_at: true,
        sku: true,
        product_images: { select: { url: true, sort_order: true } },
        product_variants: { select: { color: true, size: true, is_default: true } },
        inventory: { select: { available_quantity: true } },
      },
    }),
  ]);

  const items = products.map((p) => {
    const images = p.product_images.slice().sort((a, b) => a.sort_order - b.sort_order);
    const image = images[0]?.url ?? "";
    const quantity = p.inventory.reduce((sum, r) => sum + r.available_quantity, 0);
    return {
      id: p.id,
      title: p.name,
      shortDescription: p.short_description ?? "",
      description: p.description ?? "",
      price: Number(p.base_price),
      discountedPrice: p.discounted_price ? Number(p.discounted_price) : null,
      slug: p.slug,
      quantity,
      updatedAt: p.updated_at,
      reviews: 0,
      productVariants: p.product_variants.map((v) => ({
        color: v.color ?? "",
        size: v.size ?? "",
        isDefault: v.is_default,
        image,
      })),
    };
  });

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items,
  });
}

