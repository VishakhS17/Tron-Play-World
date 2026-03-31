import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prismaDB";
import { cleanText, hasSuspiciousInput, isUrlSlug } from "@/lib/validation/input";
import { isActiveInWindow } from "@/lib/marketing/isActiveInWindow";

export type ShopListingItem = {
  id: string;
  title: string;
  image: string;
  shortDescription: string;
  description: string;
  ageGroup: string | null;
  price: number;
  discountedPrice: number | null;
  slug: string;
  quantity: number;
  updatedAt: Date;
  reviews: number;
  product_images: { url: string; sort_order: number }[];
  productVariants: { color: string; size: string; isDefault: boolean; image: string }[];
};

export type ShopListingData = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  ageGroups: string[];
  items: ShopListingItem[];
};

function toInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

/**
 * Price filter matches what the customer sees: active flash sale price, else discounted/base.
 */
function effectiveRetailPriceWhere(
  minP: number | null,
  maxP: number | null,
  now: Date
): Prisma.productsWhereInput {
  const saleRange: Prisma.DecimalFilter = {};
  if (minP !== null) saleRange.gte = minP;
  if (maxP !== null) saleRange.lte = maxP;

  const flashLive: Prisma.flash_sale_productsWhereInput = {
    is_active: true,
    AND: [
      { OR: [{ active_from: null }, { active_from: { lte: now } }] },
      { OR: [{ active_until: null }, { active_until: { gte: now } }] },
    ],
  };

  return {
    OR: [
      {
        flash_sale_products: {
          is: { ...flashLive, sale_price: saleRange },
        },
      },
      {
        AND: [
          {
            NOT: {
              flash_sale_products: { is: flashLive },
            },
          },
          {
            OR: [
              {
                AND: [{ discounted_price: { not: null } }, { discounted_price: saleRange }],
              },
              {
                AND: [{ discounted_price: null }, { base_price: saleRange }],
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Plural/singular and case variants so e.g. diecast-car still matches diecast-cars rows. */
function slugMatchOrClause(slug: string) {
  const s = slug.trim();
  const lower = s.toLowerCase();
  const variants = new Set<string>([s, lower]);
  if (!lower.endsWith("s")) variants.add(`${lower}s`);
  if (lower.endsWith("s") && lower.length > 2) variants.add(lower.slice(0, -1));
  return [...variants].map((v) => ({ slug: { equals: v, mode: "insensitive" as const } }));
}

/** All category ids in the subtree rooted at rootId (includes root). */
async function collectDescendantCategoryIds(rootId: string): Promise<string[]> {
  const all = await prisma.categories.findMany({
    select: { id: true, parent_id: true },
  });
  const childrenByParent = new Map<string | null, string[]>();
  for (const c of all) {
    if (!childrenByParent.has(c.parent_id)) childrenByParent.set(c.parent_id, []);
    childrenByParent.get(c.parent_id)!.push(c.id);
  }
  const out = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const kid of childrenByParent.get(id) ?? []) {
      if (!out.has(kid)) {
        out.add(kid);
        queue.push(kid);
      }
    }
  }
  return [...out];
}

async function categoryIdsForFilter(slug: string): Promise<string[] | null> {
  let roots = await prisma.categories.findMany({
    where: { OR: slugMatchOrClause(slug) },
    select: { id: true },
  });
  // e.g. highlight URL uses "diecast-car" but DB slug is "die-cast-cars" (no variant overlap)
  if (roots.length === 0) {
    const firstSegment = slug.split("-").filter(Boolean)[0] ?? "";
    if (firstSegment.length >= 3) {
      roots = await prisma.categories.findMany({
        where: { slug: { contains: firstSegment, mode: "insensitive" } },
        select: { id: true },
        take: 25,
      });
    }
  }
  if (roots.length === 0) return null;
  const idSet = new Set<string>();
  for (const r of roots) {
    for (const id of await collectDescendantCategoryIds(r.id)) idSet.add(id);
  }
  return [...idSet];
}

async function brandIdForFilter(slug: string): Promise<string | null> {
  const row = await prisma.brands.findFirst({
    where: { OR: slugMatchOrClause(slug) },
    select: { id: true },
  });
  return row?.id ?? null;
}

function mapProductsToItems(
  products: {
    id: string;
    name: string;
    short_description: string | null;
    description: string | null;
    base_price: { toString(): string } | number;
    discounted_price: { toString(): string } | number | null;
    age_group: string | null;
    slug: string;
    updated_at: Date;
    sku: string | null;
    product_images: { url: string; sort_order: number }[];
    product_variants: { color: string | null; size: string | null; is_default: boolean }[];
    inventory: { available_quantity: number }[];
  }[],
  flashMap: Map<string, number>
): ShopListingItem[] {
  return products.map((p) => {
    const images = p.product_images.slice().sort((a, b) => a.sort_order - b.sort_order);
    const image = images[0]?.url ?? "";
    const quantity = p.inventory.reduce((sum, r) => sum + r.available_quantity, 0);
    const flashPrice = flashMap.get(p.id);
    const basePrice = Number(p.base_price);
    const regularDiscounted = p.discounted_price ? Number(p.discounted_price) : null;
    const effectiveDiscounted = flashPrice ?? regularDiscounted;
    return {
      id: p.id,
      title: p.name,
      image,
      shortDescription: p.short_description ?? "",
      description: p.description ?? "",
      ageGroup: p.age_group ?? null,
      price: basePrice,
      discountedPrice: effectiveDiscounted,
      slug: p.slug,
      quantity,
      updatedAt: p.updated_at,
      reviews: 0,
      product_images: images,
      productVariants: p.product_variants.map((v) => ({
        color: v.color ?? "",
        size: v.size ?? "",
        isDefault: v.is_default,
        image,
      })),
    };
  });
}

export type ShopListingResult =
  | { ok: true; data: ShopListingData }
  | { ok: false; error: string; status: number };

/**
 * Shared shop listing (used by GET /api/products and the Shop server page).
 * Avoids internal HTTP fetches so localhost always uses the same DB as Prisma.
 */
export async function getShopListing(usp: URLSearchParams): Promise<ShopListingResult> {
  const q = cleanText(usp.get("q") ?? "", 200);
  const categorySlugs = [
    ...new Set(usp.getAll("category").map((s) => cleanText(s, 160)).filter(Boolean)),
  ];
  const brand = cleanText(usp.get("brand") ?? "", 160);
  const ageGroup = cleanText(usp.get("ageGroup") ?? "", 50);
  const minPrice = usp.get("minPrice");
  const maxPrice = usp.get("maxPrice");

  if (q && hasSuspiciousInput(q)) {
    return { ok: false, error: "Invalid search query", status: 400 };
  }
  for (const cat of categorySlugs) {
    if (!isUrlSlug(cat)) {
      return { ok: false, error: "Invalid category filter", status: 400 };
    }
  }
  if (brand && !isUrlSlug(brand)) {
    return { ok: false, error: "Invalid brand filter", status: 400 };
  }
  if (ageGroup && hasSuspiciousInput(ageGroup)) {
    return { ok: false, error: "Invalid age group filter", status: 400 };
  }

  const minP = minPrice !== null && minPrice !== "" ? Number(minPrice) : null;
  const maxP = maxPrice !== null && maxPrice !== "" ? Number(maxPrice) : null;
  if ((minP !== null && !Number.isFinite(minP)) || (maxP !== null && !Number.isFinite(maxP))) {
    return { ok: false, error: "Invalid price filter", status: 400 };
  }
  if ((minP !== null && minP < 0) || (maxP !== null && maxP < 0)) {
    return { ok: false, error: "Invalid price filter", status: 400 };
  }
  const availableOnly = (usp.get("available") ?? "").trim() === "true";

  const page = Math.max(1, toInt(usp.get("page"), 1));
  const pageSize = Math.min(24, Math.max(6, toInt(usp.get("pageSize"), 12)));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { is_active: true };
  if (q) {
    const tokens = q
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 8);
    where.AND = [
      ...((where.AND as unknown[]) ?? []),
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
    const priceClause = effectiveRetailPriceWhere(minP, maxP, new Date());
    where.AND = [...((where.AND as unknown[]) ?? []), priceClause];
  }

  if (categorySlugs.length > 0) {
    const idSet = new Set<string>();
    for (const slug of categorySlugs) {
      const categoryIds = await categoryIdsForFilter(slug);
      if (categoryIds) {
        for (const id of categoryIds) idSet.add(id);
      }
    }
    if (idSet.size === 0) {
      return {
        ok: true,
        data: {
          page,
          pageSize,
          total: 0,
          totalPages: 1,
          ageGroups: [],
          items: [],
        },
      };
    }
    where.category_id = { in: [...idSet] };
  }

  if (brand) {
    const brandId = await brandIdForFilter(brand);
    if (!brandId) {
      return {
        ok: true,
        data: {
          page,
          pageSize,
          total: 0,
          totalPages: 1,
          ageGroups: [],
          items: [],
        },
      };
    }
    where.brand_id = brandId;
  }

  if (availableOnly) {
    where.inventory = { some: { available_quantity: { gt: 0 } } };
  }

  const ageGroupsPromise = prisma.products.findMany({
    where: { is_active: true, age_group: { not: null } },
    distinct: ["age_group"],
    select: { age_group: true },
    orderBy: { age_group: "asc" },
  });

  const [total, products, ageGroupsRaw] = await Promise.all([
    prisma.products.count({ where: where as never }),
    prisma.products.findMany({
      where: where as never,
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
        age_group: true,
        slug: true,
        updated_at: true,
        sku: true,
        product_images: { select: { url: true, sort_order: true } },
        product_variants: { select: { color: true, size: true, is_default: true } },
        inventory: { select: { available_quantity: true } },
      },
    }),
    ageGroupsPromise,
  ]);

  const productIds = products.map((p) => p.id);
  const flashRows = await prisma.flash_sale_products.findMany({
    where: { product_id: { in: productIds }, is_active: true },
    select: {
      product_id: true,
      sale_price: true,
      is_active: true,
      active_from: true,
      active_until: true,
    },
  });
  const now = new Date();
  const flashMap = new Map<string, number>();
  for (const row of flashRows) {
    if (isActiveInWindow(row.is_active, row.active_from, row.active_until, now)) {
      flashMap.set(row.product_id, Number(row.sale_price));
    }
  }

  const items = mapProductsToItems(products, flashMap);

  return {
    ok: true,
    data: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      ageGroups: ageGroupsRaw
        .map((x) => x.age_group)
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
      items,
    },
  };
}
