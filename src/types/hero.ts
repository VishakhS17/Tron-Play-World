
export type IHeroSlider = {
  id: number;
  sliderName: string;
  sliderImage: string;
  discountRate: number;
  slug: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  product: {
    price: number;
    discountedPrice?: number | null;
    title: string;
    slug: string;
    shortDescription: string;
  }
};

export type IHeroBanner = {
  id: number;
  bannerName: string | null;
  bannerImage: string;
  slug: string;
  productId: string;
  createdAt: Date;  // Change from string to Date
  updatedAt: Date;  // Change from string to Date
  product: {
    price: string;
    discountedPrice?: string | null;
    title: string;
    slug: string;
  }
}