import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { cleanText, hasSuspiciousInput, isUrlSlug } from "@/lib/validation/input";

function toInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = cleanText(url.searchParams.get("q") ?? "", 200);
  const category = cleanText(url.searchParams.get("category") ?? "", 160);
  const brand = cleanText(url.searchParams.get("brand") ?? "", 160);
  const ageGroup = cleanText(url.searchParams.get("ageGroup") ?? "", 50);
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");

  if (q && hasSuspiciousInput(q)) {
    return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
  }
  if (category && !isUrlSlug(category)) {
    return NextResponse.json({ error: "Invalid category filter" }, { status: 400 });
  }
  if (brand && !isUrlSlug(brand)) {
    return NextResponse.json({ error: "Invalid brand filter" }, { status: 400 });
  }
  if (ageGroup && hasSuspiciousInput(ageGroup)) {
    return NextResponse.json({ error: "Invalid age group filter" }, { status: 400 });
  }

  const minP = minPrice !== null && minPrice !== "" ? Number(minPrice) : null;
  const maxP = maxPrice !== null && maxPrice !== "" ? Number(maxPrice) : null;
  if ((minP !== null && !Number.isFinite(minP)) || (maxP !== null && !Number.isFinite(maxP))) {
    return NextResponse.json({ error: "Invalid price filter" }, { status: 400 });
  }
  if ((minP !== null && minP < 0) || (maxP !== null && maxP < 0)) {
    return NextResponse.json({ error: "Invalid price filter" }, { status: 400 });
  }
  const availableOnly = (url.searchParams.get("available") ?? "").trim() === "true";

  const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
  const pageSize = Math.min(24, Math.max(6, toInt(url.searchParams.get("pageSize"), 12)));
  const skip = (page - 1) * pageSize;

  const where: any = { is_active: true };
  if (q) {
    // Token-based combined search:
    // every token must match at least one searchable field.
    const tokens = q
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 8);
    where.AND = [
      ...(where.AND ?? []),
      ...tokens.map((token) => ({
        OR: [
          { name: { contains: token, mode: "insensitive" } },
          { description: { contains: token, mode: "insensitive" } },
          { short_description: { contains: token, mode: "insensitive" } },
          { sku: { contains: token, mode: "insensitive" } },
          { brands: { is: { name: { contains: token, mode: "insensitive" } } } },
          { categories: { is: { name: { contains: token, mode: "insensitive" } } } },
        ],
      })),
    ];
  }
  if (ageGroup) where.age_group = ageGroup;
  if (minP !== null || maxP !== null) {
    where.base_price = {
      ...(minP !== null ? { gte: minP } : {}),
      ...(maxP !== null ? { lte: maxP } : {}),
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
      // Used by storefront thumbnails even when variants are missing
      image,
      shortDescription: p.short_description ?? "",
      description: p.description ?? "",
      price: Number(p.base_price),
      discountedPrice: p.discounted_price ? Number(p.discounted_price) : null,
      slug: p.slug,
      quantity,
      updatedAt: p.updated_at,
      reviews: 0,
      // Needed for thumbnail fallback when a product has no variants
      product_images: images,
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

