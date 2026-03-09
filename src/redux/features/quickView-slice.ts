import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "@/types/product";
import React from "react";

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

export const quickView = createSlice({
  name: "quickView",
  initialState,
  reducers: {
    updateQuickView: (_, action) => {
      return {
        value: {
          ...action.payload,
        },
      };
    },

    resetQuickView: () => {
      return {
        value: initialState.value,
      };
    },
  },
});

export const { updateQuickView, resetQuickView } = quickView.actions;
export default quickView.reducer;
