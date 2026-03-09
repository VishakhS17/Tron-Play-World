type BioBlock = {
  style: "normal";
  _key: string;
  markDefs: any[];
  children: BioBlockChild[];
  _type: "block";
};

type BioBlockChild = {
  _type: "span";
  text: string;
};

type Slug = { current: string; _type: string };

export type Author = {
  name: string;
  image?: string;
  bio?: BioBlock[];
  numberOfPosts: number;
  _id: string;
  slug?: Slug;
  description?: string;
};
