import ProductItem from "@/components/Common/ProductItem";
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
  minPrice: string;
  maxPrice: string;
  available: string;
  page: number;
}) {
  const usp = new URLSearchParams();
  if (sp.q) usp.set("q", sp.q);
  for (const c of sp.categorySlugs) usp.append("category", c);
  if (sp.brand) usp.set("brand", sp.brand);
  if (sp.ageGroup) usp.set("ageGroup", sp.ageGroup);
  if (sp.minPrice) usp.set("minPrice", sp.minPrice);
  if (sp.maxPrice) usp.set("maxPrice", sp.maxPrice);
  if (sp.available) usp.set("available", sp.available);
  if (sp.page) usp.set("page", String(sp.page));
  return usp;
}

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = pickString(sp.q).trim();
  const categorySlugs = pickCategorySlugs(sp);
  const brand = pickString(sp.brand).trim();
  const ageGroup = pickString(sp.ageGroup).trim();
  const minPrice = pickString(sp.minPrice).trim();
  const maxPrice = pickString(sp.maxPrice).trim();
  const available = pickString(sp.available).trim();
  const page = Number(pickString(sp.page) || "1");

  const allCategories = await getCategories();

  const listing = await getShopListing(
    buildListingParams({ q, categorySlugs, brand, ageGroup, minPrice, maxPrice, available, page })
  );
  const productData = listing.ok
    ? listing.data
    : { items: [], totalPages: 1, ageGroups: [], page: 1, pageSize: 12, total: 0 };

  const products = productData?.items ?? [];
  const totalPages = productData?.totalPages ?? 1;
  const ageGroups: string[] = Array.isArray(productData?.ageGroups) ? productData.ageGroups : [];

  return (
    <section className="overflow-hidden py-10 pb-20">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-xl border border-gray-3 bg-white p-5">
              <form className="mb-5 space-y-3" action="/shop" method="get">
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
          </aside>

          <div className="flex-1 min-w-0">
            <h1 className="mb-6 text-2xl font-semibold text-dark">Shop</h1>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-7.5 gap-y-9">
                {products.map((item: any) => (
                  <ProductItem item={item} key={item.id} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-meta-3">
                No products available yet. Please check back soon.
              </p>
            )}

            {totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }).slice(0, 7).map((_, idx) => {
                  const p = idx + 1;
                  const params = buildListingParams({
                    q,
                    categorySlugs,
                    brand,
                    ageGroup,
                    minPrice,
                    maxPrice,
                    available,
                    page: p,
                  });
                  return (
                    <Link
                      key={p}
                      href={`/shop?${params.toString()}`}
                      className={`h-9 w-9 rounded-lg border border-gray-3 grid place-items-center text-sm ${
                        p === page ? "bg-blue text-white border-blue" : "bg-white text-dark hover:bg-gray-1"
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
