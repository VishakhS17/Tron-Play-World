import ProductItem from "@/components/Common/ProductItem";
import NewArrivalTitle from "./NewArrivalTitle";
import { getNewArrivalsProduct } from "@/get-api-data/product";

const NewArrival = async () => {
  const newProducts = await getNewArrivalsProduct();
  return (
    <section className="overflow-hidden pt-15">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 xl:px-0">
        <NewArrivalTitle />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-7.5 gap-y-9">
          {newProducts.map((item, key) => (
            <ProductItem item={item} key={key} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewArrival;
