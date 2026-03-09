"use client";

import React from "react";

function CartProvider({ children }: { children: React.ReactNode }) {
  // Cart state is managed by Redux, so this component is just a passthrough wrapper
  // Kept for backwards compatibility with the existing app structure
  return <>{children}</>;
}

export default CartProvider;
