import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

export const getReviews = unstable_cache(
  async (productSlug: string) => {
    const reviews = await prisma.review.findMany({
      where: {
        AND: [
          {
            productSlug: productSlug,
          },
          {
            isApproved: true,
          },
        ],
      },
    });
    return {
        reviews,
        avgRating: reviews.length > 0 ? reviews.reduce((sum, review) => sum + review?.ratings, 0) / reviews.length : 0,
        totalRating: reviews.length,
    };
  },
  ["reviews"],
  { tags: ["reviews"] }
);
