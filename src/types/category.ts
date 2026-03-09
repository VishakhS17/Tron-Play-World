type Slug = {
  current: string;
  _type: string;
};

export type Category = {
  title: string;
  _id: string;
  image: string;
  slug: Slug;
  description?: string;
  productCount: number;
  postCount?: number;
};
