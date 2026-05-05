
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