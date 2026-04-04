"use client";

import Link from "next/link";
import { useAppSelector } from "@/redux/store";

export default function WishlistAccountCard() {
  const count = useAppSelector((s) => s.wishlistReducer.items?.length ?? 0);

  return (
    <>
      <h2 className="text-lg font-semibold text-dark">Wishlist</h2>
      <p className="mt-3 text-sm text-meta-3">
        {count === 0 ? "No items saved yet." : `${count} item${count === 1 ? "" : "s"} saved.`}
      </p>
      <Link
        href="/wishlist"
        className="mt-4 inline-flex rounded-lg border border-gray-3 bg-white px-4 py-2 text-sm font-medium text-dark hover:border-blue hover:text-blue transition"
      >
        View wishlist
      </Link>
    </>
  );
}
