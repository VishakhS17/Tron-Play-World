

export type Product = {
  id: string;
  title: string;
  price: number;
  discountedPrice?: number | null;
  shippingPerUnit?: number;
  slug: string;
  quantity: number;
  updatedAt: Date;
  reviews: number;
  shortDescription: string;
  ageGroup?: string | null;
  /** Diecast model scale, e.g. 1:64 */
  diecastScale?: string | null;
  /** Optional catalog taxonomy (when loaded from API). */
  category?: { name: string; slug: string } | null;
  productType?: { name: string; slug: string } | null;
  productSubtype?: { name: string; slug: string } | null;
  collection?: { name: string; slug: string } | null;
  /** Cover image URL for thumbnails/cards (first product_image by sort_order). */
  image?: string;
  productVariants: {
    color: string;
    image: string;
    size: string;
    isDefault: boolean;
  }[];
  product_images?: {
    url: string;
    sort_order: number;
  }[];
};


export type IProductByDetails = {
  id: string;
  title: string;
  shortDescription: string;
  shippingPerUnit?: number;
  ageGroup?: string | null;
  diecastScale?: string | null;
  description: string | null;
  price: number;
  discountedPrice?: number | null;
  slug: string;
  quantity: number;
  updatedAt: Date;
  category: {
    title: string;
    slug: string;
  } | null;
  productVariants: {
    color: string;
    image: string;
    size: string;
    isDefault: boolean;
  }[];
  reviews: number;
  additionalInformation: {
    name: string;
    description: string;
  }[];
  customAttributes: {
    attributeName: string;
    attributeValues: {
      id: string;
      title: string;
    }[];
  }[];
  body: string | null;
  tags: string[] | null;
  offers: string[] | null;
  sku: string | null;
};

