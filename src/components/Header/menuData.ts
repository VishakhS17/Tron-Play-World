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
        path: "/signin",
      },
      {
        title: "Sign up",
        path: "/signup",
      },
      {
        title:"Privacy Policy",
        path:"/privacy-policy"
      },
      {
        title:"Terms & Conditions",
        path:"/terms-conditions"
      }
    ],
  },
  {
    title: "Contact",
    path: "/contact",
  },
];
