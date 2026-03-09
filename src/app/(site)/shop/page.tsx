import Image from "next/image";
import ProductItem from "@/components/Common/ProductItem";
import { getAllProducts } from "@/get-api-data/product";
import { getCategories } from "@/get-api-data/category";
import Link from "next/link";

const DEMO_CARDS = [
  {
    title: "Hotwheels",
    price: "₹660",
    href: "/shop/starter-garage-set",
    image: "/images/products/2e9757bf-25f8-4dcf-bc3f-9a13dd51ad61.webp",
  },
  {
    title: "Hotwheels",
    price: "₹660",
    href: "/shop/collector-display-case",
    image: "/images/products/6bbee6b4-64ce-4fc0-b70b-5d6bd4160657.webp",
  },
  {
    title: "Hotwheels",
    price: "₹660",
    image: "/images/products/94f47974-409b-40f2-ba61-9994d6b1da57.webp",
  },
  {
    title: "Hotwheels",
    price: "₹660",
    image: "/images/products/a6265a80-6b7f-49e0-8dc4-a781c908ba55.webp",
  },
  {
    title: "Hotwheels",
    price: "₹660",
    image: "/images/products/c4496e7b-112c-4b92-b7c5-c5db5c5e5500.webp",
  },
  {
    title: "Hotwheels",
    price: "₹660",
    image: "/images/products/ff72e74e-6398-47ea-8f3c-4508cb3d72cf.webp",
  },
];

export const metadata = {
  title: "Shop | i-Robox",
  description: "Browse toys and games at i-Robox.",
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);
  const normalizedProducts = products.map((item) => ({
    ...item,
    shortDescription: item.shortDescription ?? "",
    productVariants: item.productVariants.map((variant) => ({
      ...variant,
      color: variant.color ?? "",
      image: variant.image ?? "",
      size: variant.size ?? "",
    })),
  }));

  return (
    <section className="overflow-hidden py-10 pb-20">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-xl border border-gray-3 bg-white p-5">
              <h3 className="mb-4 text-lg font-semibold text-dark">Categories</h3>
              <ul className="space-y-2">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/shop?category=${cat.slug}`}
                        className="text-dark-4 hover:text-blue transition duration-200"
                      >
                        {cat.title}
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
            {normalizedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-7.5 gap-y-9">
                {normalizedProducts.map((item) => (
                  <ProductItem item={item} key={item.id} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {DEMO_CARDS.map((card, index) => {
                  const cardKey = card.href ?? `${card.title}-${index}`;
                  return (
                  card.href ? (
                    <Link
                      key={cardKey}
                      href={card.href}
                      className="rounded-xl border border-gray-3 bg-white p-5 transition hover:shadow-md block"
                    >
                      <div className="relative aspect-square rounded-lg bg-gray-1 mb-4 overflow-hidden border border-gray-3">
                        <Image
                          src={card.image}
                          alt={card.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                      <h3 className="text-base font-semibold text-dark">{card.title}</h3>
                      <p className="mt-3 text-sm font-semibold text-dark">{card.price}</p>
                    </Link>
                  ) : (
                    <article
                      key={cardKey}
                      className="rounded-xl border border-gray-3 bg-white p-5"
                    >
                      <div className="relative aspect-square rounded-lg bg-gray-1 mb-4 overflow-hidden border border-gray-3">
                        <Image
                          src={card.image}
                          alt={card.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                      <h3 className="text-base font-semibold text-dark">{card.title}</h3>
                      <p className="mt-3 text-sm font-semibold text-dark">{card.price}</p>
                      <span className="mt-3 inline-flex text-sm text-meta-4">
                        Details coming soon
                      </span>
                    </article>
                  )
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

