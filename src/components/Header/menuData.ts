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
        title: "Sign in",
        path: "/login",
      },
      {
        title:"Privacy Policy",
        path:"/privacy-policy"
      },
      {
        title:"Terms & Conditions",
        path:"/terms-conditions"
      },
      {
        title: "FAQ",
        path: "/faq",
      }
    ],
  },
  {
    title: "Contact",
    path: "/contact",
  },
];
