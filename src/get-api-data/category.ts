import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";


// get all categories
export const getCategories = unstable_cache(
  async () => {
    try {
      return await prisma.categories.findMany({
        orderBy: { updated_at: "desc" },
      });
    } catch {
      return [];
    }
  },
  ['categories'], { tags: ['categories'] }
);

// GET CATEGORY BY SLUG
export const getCategoryBySlug = unstable_cache(
  async (slug: string) => {
    return await prisma.categories.findUnique({
      where: {
        slug: slug
      }
    });
  },
  ['categories'], { tags: ['categories'] }
);

// GET CATEGORY BY ID
export const getCategoryById = unstable_cache(
  async (id: string) => {
    return await prisma.categories.findUnique({
      where: {
        id,
      }
    });
  },
  ['categories'], { tags: ['categories'] }
);