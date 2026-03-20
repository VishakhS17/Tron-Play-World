import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DemoProductGallery from "./DemoProductGallery";
import { getProductBySlug } from "@/get-api-data/product";
import { formatPrice } from "@/utils/formatePrice";
import ReviewForm from "@/components/Shop/ReviewForm";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prismaDB";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found | Tron Play World" };

  return {
    title: `${product.title} | Shop | Tron Play World`,
    description: product.description || `Buy ${product.title} at Tron Play World.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const session = await getSession();
  const approvedReviews = await prisma.reviews.findMany({
    where: { product_id: product.id, is_approved: true },
    orderBy: { created_at: "desc" },
    select: { id: true, rating: true, title: true, comment: true, created_at: true, is_verified_purchase: true },
    take: 10,
  });

  // Use product_images from DB; fall back to a placeholder only if truly none
  const sortedImages = (product.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.url)
    .filter(Boolean);

  // Also try variant images as secondary fallback
  const variantImages = product.productVariants.map((v) => v.image).filter(Boolean);
  const galleryImages = sortedImages.length > 0 ? sortedImages : variantImages.length > 0 ? variantImages : ["/images/products/placeholder.png"];

  return (
    <section className="overflow-hidden py-10 pb-20">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <Link href="/shop" className="text-sm font-medium text-blue hover:underline">
          Back to shop
        </Link>

        <div className="grid items-start gap-8 mt-5 lg:grid-cols-2">
          <DemoProductGallery
            title={product.title}
            images={galleryImages}
          />

          <div>
            <h1 className="text-3xl font-semibold text-dark">{product.title}</h1>
            <div className="mt-2 flex items-baseline gap-3">
              {product.discountedPrice ? (
                <>
                  <span className="text-2xl font-bold text-blue">
                    {formatPrice(product.discountedPrice)}
                  </span>
                  <span className="text-base font-medium text-meta-4 line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-sm font-semibold text-green rounded-full bg-green-light-6 px-2 py-0.5">
                    {Math.round((1 - product.discountedPrice / product.price) * 100)}% off
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-dark">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            {product.shortDescription ? (
              <p className="mt-4 text-base text-meta-3">{product.shortDescription}</p>
            ) : null}

            {product.description ? (
              <>
                <h2 className="mt-6 text-lg font-semibold text-dark">Description</h2>
                <p className="mt-3 text-sm text-meta-3 whitespace-pre-line">
                  {product.description}
                </p>
              </>
            ) : null}

            <button
              type="button"
              className="mt-8 inline-flex rounded-lg bg-blue px-6 py-3 text-sm font-medium text-white hover:bg-blue-dark transition-colors"
            >
              Add to cart
            </button>

            <div className="mt-10 border-t border-gray-3 pt-8">
              <h2 className="text-lg font-semibold text-dark">Reviews</h2>
              {approvedReviews.length === 0 ? (
                <p className="mt-3 text-sm text-meta-3">No approved reviews yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {approvedReviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-dark">
                          {r.rating} / 5
                        </div>
                        {r.is_verified_purchase ? (
                          <span className="text-xs rounded-full bg-gray-1 border border-gray-3 px-3 py-1 text-dark">
                            Verified purchase
                          </span>
                        ) : null}
                      </div>
                      {r.title ? (
                        <div className="mt-2 text-sm font-semibold text-dark">{r.title}</div>
                      ) : null}
                      <p className="mt-2 text-sm text-meta-3 whitespace-pre-line">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {session ? (
                <>
                  <h3 className="mt-8 text-base font-semibold text-dark">Write a review</h3>
                  <ReviewForm productId={product.id} />
                </>
              ) : (
                <p className="mt-6 text-sm text-meta-3">
                  Please <Link className="text-blue hover:underline" href="/login">sign in</Link> to write a review.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

