import ProductItem from "@/components/Common/ProductItem";
import LiveShopFilters from "@/components/Shop/LiveShopFilters";
import { getCategories } from "@/get-api-data/category";
import Link from "next/link";
import { getShopListing } from "@/lib/shop/shopListing";

export const metadata = {
  title: "Shop | i-Robox",
  description: "Browse toys and games at i-Robox.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function pickCategorySlugs(sp: Record<string, string | string[] | undefined>): string[] {
  const raw = sp.category;
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((s) => s.trim()).filter(Boolean))];
  }
  if (typeof raw === "string" && raw.trim()) {
    return [raw.trim()];
  }
  return [];
}

function buildListingParams(sp: {
  q: string;
  categorySlugs: string[];
  brand: string;
  ageGroup: string;
  diecastScale: string;
  minPrice: string;
  maxPrice: string;
  available: string;
  sort: string;
  page: number;
}) {
  const usp = new URLSearchParams();
  if (sp.q) usp.set("q", sp.q);
  for (const c of sp.categorySlugs) usp.append("category", c);
  if (sp.brand) usp.set("brand", sp.brand);
  if (sp.ageGroup) usp.set("ageGroup", sp.ageGroup);
  if (sp.diecastScale) usp.set("diecastScale", sp.diecastScale);
  if (sp.minPrice) usp.set("minPrice", sp.minPrice);
  if (sp.maxPrice) usp.set("maxPrice", sp.maxPrice);
  if (sp.available) usp.set("available", sp.available);
  if (sp.sort === "price_asc" || sp.sort === "price_desc") usp.set("sort", sp.sort);
  if (sp.page > 1) usp.set("page", String(sp.page));
  return usp;
}

/** Page numbers with ellipses: e.g. 1 2 3 4 … 48 49 50 … 98 99 100 */
function paginationItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 1) return [];
  const clamped = Math.max(1, Math.min(total, current));

  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const add = (set: Set<number>, p: number) => {
    if (p >= 1 && p <= total) set.add(p);
  };
  const set = new Set<number>();
  add(set, 1);
  add(set, 2);
  add(set, 3);
  add(set, 4);
  add(set, total - 2);
  add(set, total - 1);
  add(set, total);
  add(set, clamped - 1);
  add(set, clamped);
  add(set, clamped + 1);

  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev > 0 && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = pickString(sp.q).trim();
  const categorySlugs = pickCategorySlugs(sp);
  const brand = pickString(sp.brand).trim();
  const ageGroup = pickString(sp.ageGroup).trim();
  const diecastScale = pickString(sp.diecastScale).trim();
  const minPrice = pickString(sp.minPrice).trim();
  const maxPrice = pickString(sp.maxPrice).trim();
  const available = pickString(sp.available).trim();
  const sortRaw = pickString(sp.sort).trim();
  const sort =
    sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "";
  const page = Number(pickString(sp.page) || "1");

  const allCategories = await getCategories();

  const listing = await getShopListing(
    buildListingParams({
      q,
      categorySlugs,
      brand,
      ageGroup,
      diecastScale,
      minPrice,
      maxPrice,
      available,
      sort,
      page,
    })
  );
  const productData = listing.ok
    ? listing.data
    : {
        items: [],
        totalPages: 1,
        ageGroups: [],
        diecastScales: [],
        brands: [],
        page: 1,
        pageSize: 12,
        total: 0,
      };

  const products = productData?.items ?? [];
  const totalPages = Math.max(1, productData?.totalPages ?? 1);
  const currentPage = productData?.page ?? page;
  const ageGroups: string[] = Array.isArray(productData?.ageGroups) ? productData.ageGroups : [];
  const diecastScales: string[] = Array.isArray(productData?.diecastScales) ? productData.diecastScales : [];
  const shopBrands: { slug: string; name: string }[] = Array.isArray(productData?.brands)
    ? productData.brands
    : [];
  const renderFilters = (formId: string) => (
    <div className="rounded-xl border border-gray-3 bg-white p-5">
      <form id={formId} className="mb-5 space-y-3" action="/shop" method="get">
        <LiveShopFilters formId={formId} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="minPrice"
            defaultValue={minPrice}
            placeholder="Min ₹"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <input
            name="maxPrice"
            defaultValue={maxPrice}
            placeholder="Max ₹"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </div>
        <select
          name="ageGroup"
          defaultValue={ageGroup}
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        >
          <option value="">All age groups</option>
          {ageGroups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>

        <select
          name="brand"
          defaultValue={brand}
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        >
          <option value="">All brands</option>
          {shopBrands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          name="diecastScale"
          defaultValue={diecastScale}
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        >
          <option value="">All scales</option>
          {diecastScales.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-dark">Categories</h3>
          <p className="mb-2 text-xs text-meta-4">Select one or more.</p>
          <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {allCategories.length > 0 ? (
              allCategories.map((cat) => (
                <li key={cat.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-dark-4 hover:text-blue">
                    <input
                      type="checkbox"
                      name="category"
                      value={cat.slug}
                      defaultChecked={categorySlugs.includes(cat.slug)}
                      className="mt-0.5 rounded border-gray-3 text-blue focus:ring-blue"
                    />
                    <span className="leading-snug">
                      {"name" in cat ? (cat as { name: string }).name : (cat as { title: string }).title}
                    </span>
                  </label>
                </li>
              ))
            ) : (
              <li className="text-meta-4 text-sm">No categories yet.</li>
            )}
          </ul>
        </div>

        <label className="flex items-center gap-2 text-sm text-meta-3">
          <input type="checkbox" name="available" value="true" defaultChecked={available === "true"} />
          In stock only
        </label>

        <div>
          <label className="mb-1 block text-sm font-semibold text-dark">Sort by</label>
          <select
            name="sort"
            defaultValue={sort}
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            <option value="">Newest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-dark transition"
        >
          Apply
        </button>
        <Link
          href="/shop"
          className="block w-full rounded-lg border border-gray-3 bg-white px-4 py-2 text-center text-sm font-medium text-meta-3 hover:bg-gray-1 hover:text-dark transition"
        >
          Clear filters
        </Link>
      </form>
    </div>
  );

  return (
    <section className="overflow-hidden py-10 pb-20">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <details className="rounded-xl border border-gray-3 bg-white lg:hidden">
              <summary className="cursor-pointer list-none select-none px-4 py-3 text-sm font-semibold text-dark border-b border-gray-3">
                Filters
              </summary>
              <div className="p-1">{renderFilters("shop-filters-form-mobile")}</div>
            </details>

            <div className="hidden lg:block">{renderFilters("shop-filters-form")}</div>
          </aside>

          <div className="flex-1 min-w-0">
            <h1 className="mb-6 text-2xl font-semibold text-dark">Shop</h1>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-7.5 gap-y-9">
                {products.map((item) => (
                  <ProductItem
                    item={{
                      id: item.id,
                      title: item.title,
                      price: item.price,
                      discountedPrice: item.discountedPrice,
                      slug: item.slug,
                      quantity: item.quantity,
                      updatedAt: item.updatedAt,
                      reviews: item.reviews,
                      shortDescription: item.shortDescription,
                      ageGroup: item.ageGroup,
                      diecastScale: item.diecastScale,
                      shippingPerUnit: item.shippingPerUnit,
                      productVariants: item.productVariants,
                      product_images: item.product_images,
                      image: item.image,
                    }}
                    key={item.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-meta-3">
                No products available yet. Please check back soon.
              </p>
            )}

            {totalPages > 1 ? (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
                aria-label="Shop pagination"
              >
                {currentPage > 1 ? (
                  <Link
                    href={`/shop?${buildListingParams({
                      q,
                      categorySlugs,
                      brand,
                      ageGroup,
                      diecastScale,
                      minPrice,
                      maxPrice,
                      available,
                      sort,
                      page: currentPage - 1,
                    }).toString()}`}
                    className="h-9 min-w-9 px-2 rounded-lg border border-gray-3 bg-white grid place-items-center text-sm font-medium text-dark hover:bg-gray-1"
                    aria-label="Previous page"
                  >
                    &lt;
                  </Link>
                ) : (
                  <span
                    className="h-9 min-w-9 px-2 rounded-lg border border-gray-3 bg-gray-1 grid place-items-center text-sm text-meta-4 pointer-events-none"
                    aria-hidden
                  >
                    &lt;
                  </span>
                )}

                {paginationItems(currentPage, totalPages).map((item, i) =>
                  item === "ellipsis" ? (
                    <span
                      key={`e-${i}`}
                      className="px-1 text-sm text-meta-4 select-none"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={`/shop?${buildListingParams({
                        q,
                        categorySlugs,
                        brand,
                        ageGroup,
                        diecastScale,
                        minPrice,
                        maxPrice,
                        available,
                        sort,
                        page: item,
                      }).toString()}`}
                      className={`h-9 min-w-9 px-2 rounded-lg border grid place-items-center text-sm font-medium ${
                        item === currentPage
                          ? "bg-blue text-white border-blue"
                          : "border-gray-3 bg-white text-blue hover:bg-gray-1"
                      }`}
                      aria-current={item === currentPage ? "page" : undefined}
                    >
                      {item}
                    </Link>
                  )
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={`/shop?${buildListingParams({
                      q,
                      categorySlugs,
                      brand,
                      ageGroup,
                      diecastScale,
                      minPrice,
                      maxPrice,
                      available,
                      sort,
                      page: currentPage + 1,
                    }).toString()}`}
                    className="h-9 min-w-9 px-2 rounded-lg border border-gray-3 bg-white grid place-items-center text-sm font-medium text-dark hover:bg-gray-1"
                    aria-label="Next page"
                  >
                    &gt;
                  </Link>
                ) : (
                  <span
                    className="h-9 min-w-9 px-2 rounded-lg border border-gray-3 bg-gray-1 grid place-items-center text-sm text-meta-4 pointer-events-none"
                    aria-hidden
                  >
                    &gt;
                  </span>
                )}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
