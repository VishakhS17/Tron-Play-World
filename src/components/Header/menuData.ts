import type { MenuItem } from "./types";

export const menuData: MenuItem[] = [
  {
    title: "Popular",
    path: "/popular?sort=popular",
  },
  {
    title: "Shop",
    path: "/shop",
  },

  {
    title: "Pages",
    submenu: [
      {
        title: "Cart",
        path: "/cart",
      },
      {
        title: "Wishlist",
        path: "/wishlist",
      },
      {
        title: "Privacy Policy",
        path: "/privacy-policy",
      },
      {
        title: "Terms & Conditions",
        path: "/terms-conditions",
      },
      {
        title: "Return & Cancellation",
        path: "/return-cancellation",
      },
      {
        title: "FAQ",
        path: "/faq",
      },
    ],
  },
  {
    title: "Contact",
    path: "/contact",
  },
];
