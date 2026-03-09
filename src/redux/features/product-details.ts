import { createSlice } from "@reduxjs/toolkit";
import { Product } from "@/types/product";

type InitialState = {
  value: Product;
};

const initialState = {
  value: {
    _id: 0,
    name: "",
    reviews: [""],
    price: 0,
    discountedPrice: 0,
    category: "",
    tags: [""],
    description: [],
    shortDescription: "",
    colors: [""],
    thumbnails: [""],
    previewImages: [""],
    additionalInformation: {},
    customAttributes: {},
    status: true,
    offers: [""],
  } as unknown as Product,
} as InitialState;

export const productDetails = createSlice({
  name: "productDetails",
  initialState,
  reducers: {
    updateproductDetails: (_, action) => {
      return {
        value: {
          ...action.payload,
        },
      };
    },
  },
});

export const { updateproductDetails } = productDetails.actions;
export default productDetails.reducer;
