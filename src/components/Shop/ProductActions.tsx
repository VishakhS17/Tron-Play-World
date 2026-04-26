"use client";

import { useCart } from "@/hooks/useCart";
import { addItemToWishlist } from "@/redux/features/wishlist-slice";
import { AppDispatch, useAppSelector } from "@/redux/store";
import { HeartIcon, HeartSolid } from "@/assets/icons";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";

type ProductActionsProps = {
  id: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  discountedPrice?: number | null;
  quantity: number;
  shippingPerUnit?: number;
  color?: string;
  size?: string;
};

export default function ProductActions(props: ProductActionsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { addItem, cartDetails, incrementItem, decrementItem } = useCart();
  const wishlistItems = useAppSelector((state) => state.wishlistReducer.items);
  const isAlreadyWishlisted = wishlistItems.some((w) => w.id === props.id);
  const currentQty = (cartDetails?.[props.id]?.quantity ?? 0) as number;

  function handleAddToCart() {
    if (props.quantity < 1) {
      toast.error("This product is out of stock!");
      return;
    }

    addItem({
      id: props.id,
      name: props.title,
      price: props.discountedPrice ? props.discountedPrice : props.price,
      currency: "inr",
      image: props.image,
      slug: props.slug,
      availableQuantity: props.quantity,
      shippingPerUnit: Number(props.shippingPerUnit ?? 0),
      color: props.color ?? "",
      size: props.size ?? "",
      quantity: 1,
    });
    toast.success("Product added to cart!");
  }

  function handleWishlist() {
    dispatch(
      addItemToWishlist({
        id: props.id,
        title: props.title,
        slug: props.slug,
        image: props.image,
        price: props.discountedPrice ? props.discountedPrice : props.price,
        quantity: props.quantity,
        color: props.color ?? "",
      })
    );
  }

  return (
    <div className="mt-8 flex items-center gap-2.5">
      {currentQty > 0 ? (
        <div className="inline-flex items-center rounded-lg border border-gray-3 bg-white">
          <button
            onClick={() => decrementItem(props.id)}
            className="px-3 py-2 text-dark hover:bg-gray-1"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="px-3 py-2 text-sm font-medium text-dark">{currentQty}</span>
          <button
            onClick={() => incrementItem(props.id)}
            className="px-3 py-2 text-dark hover:bg-gray-1"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={props.quantity < 1}
          className="inline-flex rounded-lg bg-blue px-6 py-3 text-sm font-medium text-white hover:bg-blue-dark transition-colors disabled:opacity-60"
        >
          {props.quantity > 0 ? "Add to cart" : "Out of Stock"}
        </button>
      )}

      <button
        type="button"
        onClick={handleWishlist}
        aria-label="Add to wishlist"
        className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-lg border border-gray-3 bg-white text-dark hover:text-blue transition"
      >
        {isAlreadyWishlisted ? <HeartSolid /> : <HeartIcon width={18} height={18} />}
      </button>
    </div>
  );
}

