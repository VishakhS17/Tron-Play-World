import Link from "next/link";
import React from "react";

const CheckoutBtn = () => {
  return (
    <Link
      href="/checkout"
      className="bg-dark hover:bg-darkLight  inline-flex font-medium  text-custom-sm py-[7px] px-5 rounded-lg text-white ease-out duration-200 "
    >
      Checkout
    </Link>
  );
};

export default CheckoutBtn;
