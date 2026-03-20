import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

const pickDefaultImage = (product: {
  product_images?: { url: string; sort_order: number }[];
}) => {
  const images = product.product_images ?? [];
  if (images.length === 0) return "";
  return images.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? "";
};

// get product for id and title
export const getProductsIdAndTitle = unstable_cache(
  async () => {
    return await prisma.products.findMany({
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        name: true,
      },
    });
  },
  ['products'], { tags: ['products'] }
);

// get new arrival products (homepage)
export const getNewArrivalsProduct = unstable_cache(
  async () => {
    const products = await prisma.products.findMany({
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        name: true,
        short_description: true,
        base_price: true,
        discounted_price: true,
        slug: true,
        updated_at: true,
        product_variants: {
          select: {
            color: true,
            size: true,
            is_default: true,
          }
        },
        product_images: { select: { url: true, sort_order: true } },
      },
      take: 8
    });
    return products.map((item) => ({
      id: item.id,
      title: item.name,
      shortDescription: item.short_description ?? "",
      description: "",
      body: "",
      price: Number(item.base_price),
      discountedPrice: item.discounted_price ? Number(item.discounted_price) : null,
      slug: item.slug,
      quantity: 0,
      sku: item.sku ?? "",
      tags: [],
      offers: "",
      updatedAt: item.updated_at,
      product_images: item.product_images,
      productVariants: item.product_variants.map((v) => ({
        id: 0,
        productId: item.id,
        image: pickDefaultImage(item),
        color: v.color ?? "",
        size: v.size ?? "",
        isDefault: v.is_default,
      })),
      reviews: 0,
    }));
  },
  ['products'], { tags: ['products'] }
);

// get best selling products (placeholder ordering)
export const getBestSellingProducts = unstable_cache(
  async () => {
    const products = await prisma.products.findMany({
      select: {
        id: true,
        name: true,
        short_description: true,
        base_price: true,
        discounted_price: true,
        slug: true,
        updated_at: true,
        product_variants: {
          select: {
            color: true,
            size: true,
            is_default: true,
          }
        },
        product_images: { select: { url: true, sort_order: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 6
    });
    return products.map((item) => ({
      id: item.id,
      title: item.name,
      shortDescription: item.short_description ?? "",
      description: "",
      body: "",
      price: Number(item.base_price),
      discountedPrice: item.discounted_price ? Number(item.discounted_price) : null,
      slug: item.slug,
      quantity: 0,
      sku: item.sku ?? "",
      tags: [],
      offers: "",
      updatedAt: item.updated_at,
      product_images: item.product_images,
      productVariants: item.product_variants.map((v) => ({
        id: 0,
        productId: item.id,
        image: pickDefaultImage(item),
        color: v.color ?? "",
        size: v.size ?? "",
        isDefault: v.is_default,
      })),
      reviews: 0,
    }));
  },
  ['products'], { tags: ['products'] }
);

// get latest products (homepage)
export const getLatestProducts = unstable_cache(
  async () => {
    const products = await prisma.products.findMany({
      select: {
        id: true,
        name: true,
        short_description: true,
        base_price: true,
        discounted_price: true,
        slug: true,
        updated_at: true,
        product_variants: {
          select: {
            color: true,
            size: true,
            is_default: true,
          }
        },
        product_images: { select: { url: true, sort_order: true } },
      },
      orderBy: [{ updated_at: "desc" }],
      take: 3
    });
    return products.map((item) => ({
      id: item.id,
      title: item.name,
      shortDescription: item.short_description ?? "",
      description: "",
      body: "",
      price: Number(item.base_price),
      discountedPrice: item.discounted_price ? Number(item.discounted_price) : null,
      slug: item.slug,
      quantity: 0,
      sku: item.sku ?? "",
      tags: [],
      offers: "",
      updatedAt: item.updated_at,
      product_images: item.product_images,
      productVariants: item.product_variants.map((v) => ({
        id: 0,
        productId: item.id,
        image: pickDefaultImage(item),
        color: v.color ?? "",
        size: v.size ?? "",
        isDefault: v.is_default,
      })),
      reviews: 0,
    }));
  },
  ['products'], { tags: ['products'] }
);


// GET ALL PRODUCTS
export const getAllProducts = unstable_cache(
  async (
    orderBy: { updated_at?: "asc" | "desc" } = { updated_at: "desc" }
  ) => {
    try {
      const products = await prisma.products.findMany({
        orderBy,
        select: {
          id: true,
          name: true,
          short_description: true,
          base_price: true,
          discounted_price: true,
          slug: true,
          updated_at: true,
          product_variants: {
            select: {
              color: true,
              size: true,
              is_default: true,
            }
          },
          product_images: { select: { url: true, sort_order: true } },
        },
      })
      return products.map((item) => ({
        id: item.id,
        title: item.name,
        shortDescription: item.short_description ?? "",
        description: "",
        body: "",
        price: Number(item.base_price),
        discountedPrice: item.discounted_price ? Number(item.discounted_price) : null,
        slug: item.slug,
        quantity: 0,
        sku: item.sku ?? "",
        tags: [],
        offers: "",
        updatedAt: item.updated_at,
        product_images: item.product_images,
        productVariants: item.product_variants.map((v) => ({
          id: 0,
          productId: item.id,
          image: pickDefaultImage(item),
          color: v.color ?? "",
          size: v.size ?? "",
          isDefault: v.is_default,
        })),
        reviews: 0,
      }));
    } catch {
      return [];
    }
  },
  ['products'], { tags: ['products'] }
);

// GET PRODUCT BY SLUG
export const getProductBySlug = async (slug: string) => {
  const product = await prisma.products.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      short_description: true,
      description: true,
      base_price: true,
      discounted_price: true,
      slug: true,
      updated_at: true,
      categories: {
        select: {
          slug: true,
          name: true,
        },
      },
      product_variants: {
        select: {
          color: true,
          size: true,
          is_default: true,
        }
      },
      product_images: { select: { url: true, sort_order: true } },
      sku: true,
    },
  });
  if (!product) return null;
  return {
    id: product.id,
    title: product.name,
    shortDescription: product.short_description ?? "",
    description: product.description ?? "",
    body: "",
    price: Number(product.base_price),
    discountedPrice: product.discounted_price ? Number(product.discounted_price) : null,
    slug: product.slug,
    quantity: 0,
    sku: product.sku ?? "",
    tags: [],
    offers: "",
    updatedAt: product.updated_at,
    category: product.categories
      ? { title: product.categories.name, slug: product.categories.slug }
      : null,
    product_images: product.product_images,
    productVariants: product.product_variants.map((v) => ({
      id: 0,
      productId: product.id,
      image: pickDefaultImage(product),
      color: v.color ?? "",
      size: v.size ?? "",
      isDefault: v.is_default,
    })),
    reviews: 0,
    additionalInformation: [],
    customAttributes: [],
  };
}

// GET PRODUCT BY ID
export const getProductById = async (productId: string) => {
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      short_description: true,
      description: true,
      base_price: true,
      discounted_price: true,
      slug: true,
      updated_at: true,
      sku: true,
      product_images: { select: { url: true, sort_order: true } },
      product_variants: { select: { color: true, size: true, is_default: true } },
      categories: { select: { name: true, slug: true } },
    },
  });
  if (!product) return null;
  return {
    id: product.id,
    title: product.name,
    shortDescription: product.short_description ?? "",
    description: product.description ?? "",
    body: "",
    price: Number(product.base_price),
    discountedPrice: product.discounted_price ? Number(product.discounted_price) : null,
    slug: product.slug,
    quantity: 0,
    sku: product.sku ?? "",
    tags: [],
    offers: "",
    updatedAt: product.updated_at,
    category: product.categories
      ? { title: product.categories.name, slug: product.categories.slug }
      : null,
    productVariants: product.product_variants.map((v) => ({
      id: 0,
      productId: product.id,
      image: pickDefaultImage(product),
      color: v.color ?? "",
      size: v.size ?? "",
      isDefault: v.is_default,
    })),
    reviews: 0,
    additionalInformation: [],
    customAttributes: [],
  };
};

export const getRelatedProducts = unstable_cache(
  async (_category: string, _tags: string[] | undefined, currentProductId: string, _productTitle: string) => {
    const products = await prisma.products.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        short_description: true,
        base_price: true,
        discounted_price: true,
        updated_at: true,
        product_images: { select: { url: true, sort_order: true } },
        product_variants: { select: { color: true, size: true, is_default: true } },
      },
      where: {
        id: {
          not: currentProductId, // Exclude the current product
        },
      },
      
      orderBy: {
        updated_at: 'desc',
      },
      take: 8, // or however many related items you want
    });

    return products.map((item) => ({
      id: item.id,
      title: item.name,
      shortDescription: item.short_description ?? "",
      description: "",
      body: "",
      price: Number(item.base_price),
      discountedPrice: item.discounted_price ? Number(item.discounted_price) : null,
      slug: item.slug,
      quantity: 0,
      sku: "",
      tags: [],
      offers: "",
      updatedAt: item.updated_at,
      product_images: item.product_images,
      productVariants: item.product_variants.map((v) => ({
        id: 0,
        productId: item.id,
        image: pickDefaultImage(item),
        color: v.color ?? "",
        size: v.size ?? "",
        isDefault: v.is_default,
      })),
      reviews: 0,
    }));
  },
  ['related-products'],
  { tags: ['products'] }
);
