import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

export const getReviews = unstable_cache(
  async (productId: string) => {
    const reviews = await prisma.reviews.findMany({
      where: {
        product_id: productId,
        is_approved: true,
      },
    });
    return {
        reviews,
        avgRating:
          reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length
            : 0,
        totalRating: reviews.length,
    };
  },
  ["reviews"],
  { tags: ["reviews"] }
);
