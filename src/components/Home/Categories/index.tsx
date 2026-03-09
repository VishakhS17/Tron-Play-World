import { getCategories } from "@/get-api-data/category";
import CategoryCarouselArea from "./CategoryCarouselArea";

const Categories = async () => {
  const categories = await getCategories();

  return (
    <section className="overflow-hidden pt-17.5">
      <div className="w-full px-4 pb-16 mx-auto border-b max-w-7xl sm:px-8 xl:px-0 border-gray-3">
        <CategoryCarouselArea categories={categories} />
      </div>
    </section>
  );
};

export default Categories;
