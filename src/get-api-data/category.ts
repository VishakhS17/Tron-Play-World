import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";


// get all categories
export const getCategories = unstable_cache(
  async () => {
    return await prisma.category.findMany({
      orderBy: { updatedAt: "desc" },
    });
  },
  ['categories'], { tags: ['categories'] }
);

// GET CATEGORY BY SLUG
export const getCategoryBySlug = unstable_cache(
  async (slug: string) => {
    return await prisma.category.findUnique({
      where: {
        slug: slug
      }
    });
  },
  ['categories'], { tags: ['categories'] }
);

// GET CATEGORY BY ID
export const getCategoryById = unstable_cache(
  async (id: number) => {
    return await prisma.category.findUnique({
      where: {
        id: id
      }
    });
  },
  ['categories'], { tags: ['categories'] }
);