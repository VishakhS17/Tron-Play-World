import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DemoProductGallery from "./DemoProductGallery";

const PRODUCT_IMAGES = [
  "/images/products/2e9757bf-25f8-4dcf-bc3f-9a13dd51ad61.webp",
  "/images/products/6bbee6b4-64ce-4fc0-b70b-5d6bd4160657.webp",
  "/images/products/94f47974-409b-40f2-ba61-9994d6b1da57.webp",
  "/images/products/a6265a80-6b7f-49e0-8dc4-a781c908ba55.webp",
];

const DEMO_PRODUCT_PAGES = {
  "starter-garage-set": {
    title: "Starter Garage Set",
    price: "$24.99",
    description:
      "A beginner-friendly set designed for everyday play and neat shelf display. This page is ready for your real images and final specs.",
    highlights: [
      "Modular storage slots",
      "Display-first baseplate",
      "Quick assembly pieces",
    ],
    heroImage: PRODUCT_IMAGES[0],
    thumbnails: [PRODUCT_IMAGES[1], PRODUCT_IMAGES[2], PRODUCT_IMAGES[3]],
  },
  "collector-display-case": {
    title: "Collector Display Case",
    price: "$39.99",
    description:
      "A clean, premium-style display case concept page. Replace placeholders with your final photo set once assets are ready.",
    highlights: [
      "Clear front presentation",
      "Stack-friendly form factor",
      "Collector-ready profile",
    ],
    heroImage: PRODUCT_IMAGES[1],
    thumbnails: [PRODUCT_IMAGES[0], PRODUCT_IMAGES[2], PRODUCT_IMAGES[3]],
  },
} as const;

type DemoSlug = keyof typeof DEMO_PRODUCT_PAGES;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = DEMO_PRODUCT_PAGES[slug as DemoSlug];
  if (!product) return { title: "Product Not Found | i-Robox" };

  return {
    title: `${product.title} | Shop | i-Robox`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = DEMO_PRODUCT_PAGES[slug as DemoSlug];
  if (!product) notFound();

  return (
    <section className="overflow-hidden py-10 pb-20">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <Link href="/shop" className="text-sm font-medium text-blue hover:underline">
          Back to shop
        </Link>

        <div className="grid items-start gap-8 mt-5 lg:grid-cols-2">
          <DemoProductGallery
            title={product.title}
            images={[product.heroImage, ...product.thumbnails]}
          />

          <div>
            <h1 className="text-3xl font-semibold text-dark">{product.title}</h1>
            <p className="mt-2 text-xl font-semibold text-dark">{product.price}</p>
            <p className="mt-4 text-base text-meta-3">{product.description}</p>

            <h2 className="mt-6 text-lg font-semibold text-dark">Highlights</h2>
            <ul className="mt-3 space-y-2 text-sm text-meta-3">
              {product.highlights.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>

            <button
              type="button"
              className="mt-8 inline-flex rounded-lg bg-blue px-6 py-3 text-sm font-medium text-white hover:bg-blue-dark transition-colors"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

