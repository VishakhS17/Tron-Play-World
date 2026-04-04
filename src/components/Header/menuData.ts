import type { HeaderNavData } from "@/lib/nav/headerNav";
import type { MenuItem } from "./types";

function shopBrandInCategory(brandSlug: string, categorySlug: string) {
  const u = new URLSearchParams();
  u.set("brand", brandSlug);
  u.set("category", categorySlug);
  return `/shop?${u.toString()}`;
}

/** Build primary nav from DB-driven brands/categories (Cars + Other Toys). */
export function buildHeaderMenuData(nav: HeaderNavData): MenuItem[] {
  const diecastSlug = nav.diecastCategorySlug;

  const carsItems: MenuItem[] = nav.carsBrands.map((b) => ({
    title: b.name,
    path: diecastSlug
      ? shopBrandInCategory(b.slug, diecastSlug)
      : `/shop?brand=${encodeURIComponent(b.slug)}`,
  }));

  const carsMenu: MenuItem =
    carsItems.length > 0
      ? { title: "Cars", submenu: carsItems }
      : {
          title: "Cars",
          submenu: [
            {
              title: diecastSlug ? "Browse diecast" : "Browse shop",
              path: diecastSlug
                ? `/shop?category=${encodeURIComponent(diecastSlug)}`
                : "/shop",
            },
          ],
        };

  const grouped =
    nav.otherToyGroups.length > 0
      ? nav.otherToyGroups.map((g) => ({
          heading: g.categoryName,
          items: g.brands.map((b) => ({
            title: b.name,
            path: shopBrandInCategory(b.slug, g.categorySlug),
          })),
        }))
      : [
          {
            heading: "Shop",
            items: [{ title: "All products", path: "/shop" }],
          },
        ];

  return [
    { title: "Popular", path: "/popular?sort=popular" },
    { title: "Shop", path: "/shop" },
    carsMenu,
    { title: "Other Toys", groupedSubmenu: grouped },
    { title: "Contact", path: "/contact" },
  ];
}
