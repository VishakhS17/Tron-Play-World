import ProductItem from "@/components/Common/ProductItem";
import { getCategories } from "@/get-api-data/category";
import Link from "next/link";

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

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = pickString(sp.q).trim();
  const category = pickString(sp.category).trim();
  const brand = pickString(sp.brand).trim();
  const ageGroup = pickString(sp.ageGroup).trim();
  const minPrice = pickString(sp.minPrice).trim();
  const maxPrice = pickString(sp.maxPrice).trim();
  const available = pickString(sp.available).trim();
  const page = Number(pickString(sp.page) || "1");

  const categories = await getCategories();

  // Avoid crashing on Vercel when NEXT_PUBLIC_SITE_URL isn't set yet.
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  let productData: any = null;
  if (baseUrl) {
    try {
      const productRes = await fetch(
        `${baseUrl}/api/products?` +
          new URLSearchParams({
            ...(q ? { q } : {}),
            ...(category ? { category } : {}),
            ...(brand ? { brand } : {}),
            ...(ageGroup ? { ageGroup } : {}),
            ...(minPrice ? { minPrice } : {}),
            ...(maxPrice ? { maxPrice } : {}),
            ...(available ? { available } : {}),
            ...(page ? { page: String(page) } : {}),
          }).toString(),
        { cache: "no-store" }
      );
      productData = await productRes.json().catch(() => null);
    } catch {
      productData = null;
    }
  }

  const products = productData?.items ?? [];
  const totalPages = productData?.totalPages ?? 1;

  return (
    <section className="overflow-hidden py-10 pb-20">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-xl border border-gray-3 bg-white p-5">
              <form className="mb-5 space-y-3" action="/shop">
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
                <label className="flex items-center gap-2 text-sm text-meta-3">
                  <input type="checkbox" name="available" value="true" defaultChecked={available === "true"} />
                  In stock only
                </label>
                <button className="w-full rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-dark transition">
                  Apply
                </button>
              </form>

              <h3 className="mb-4 text-lg font-semibold text-dark">Categories</h3>
              <ul className="space-y-2">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/shop?category=${cat.slug}`}
                        className="text-dark-4 hover:text-blue transition duration-200"
                      >
                        {"name" in cat ? (cat as any).name : (cat as any).title}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-dark-4 text-sm">No categories yet.</li>
                )}
              </ul>
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
                  const params = new URLSearchParams({
                    ...(q ? { q } : {}),
                    ...(category ? { category } : {}),
                    ...(brand ? { brand } : {}),
                    ...(ageGroup ? { ageGroup } : {}),
                    ...(minPrice ? { minPrice } : {}),
                    ...(maxPrice ? { maxPrice } : {}),
                    ...(available ? { available } : {}),
                    page: String(p),
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

