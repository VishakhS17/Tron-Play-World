import { prisma } from "@/lib/prismaDB";
import { isActiveInWindow } from "@/lib/marketing/isActiveInWindow";
import Home, { type HomeCategoryTile, type HomeHighlightCard } from "@/components/Home";
import type { HeroSlide } from "@/components/Home/HeroBannerCarousel";

const FALLBACK_HIGHLIGHT_IMAGE =
  "/images/collections/693c2377f0a417e6ed0a3758-rc-cars-1-14-all-terrain-rc-car-for.jpg";

export default async function HomePage() {
  const now = new Date();

  const highlightsPromise = prisma.homepage_highlights
    .findMany({
      orderBy: { sort_order: "asc" },
      include: {
        categories: { select: { slug: true, name: true } },
        brands: { select: { slug: true, name: true } },
        products: {
          select: {
            slug: true,
            name: true,
            product_images: { orderBy: { sort_order: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
    })
    .catch(() =>
      prisma.homepage_highlights.findMany({
        orderBy: { sort_order: "asc" },
        include: {
          categories: { select: { slug: true, name: true } },
          products: {
            select: {
              slug: true,
              name: true,
              product_images: { orderBy: { sort_order: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      })
    );

  const [slidesRaw, highlightsRaw, categoriesRaw] = await Promise.all([
    prisma.homepage_hero_slides.findMany({ orderBy: { sort_order: "asc" } }),
    highlightsPromise,
    prisma.categories.findMany({
      orderBy: { name: "asc" },
      take: 8,
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const heroSlides: HeroSlide[] = slidesRaw
    .filter((s) => isActiveInWindow(s.is_active, s.active_from, s.active_until, now))
    .map((s) => ({
      id: s.id,
      image_url: s.image_url,
      title: s.title,
      link_url: s.link_url,
    }));

  const highlights: HomeHighlightCard[] = highlightsRaw
    .filter((h) => isActiveInWindow(h.is_active, h.active_from, h.active_until, now))
    .map((h) => {
      let href = h.link_url ?? "";
      let image = h.image_url ?? "";
      const label = h.title;
      const alt = h.title;

      if (h.kind === "CATEGORY" && h.categories) {
        if (!href) href = `/shop?category=${encodeURIComponent(h.categories.slug)}`;
        if (!image) image = FALLBACK_HIGHLIGHT_IMAGE;
      } else if (h.kind === "BRAND" && h.brands) {
        if (!href) href = `/shop?brand=${encodeURIComponent(h.brands.slug)}`;
        if (!image) image = FALLBACK_HIGHLIGHT_IMAGE;
      } else if (h.kind === "PRODUCT" && h.products) {
        if (!href) href = `/shop/${h.products.slug}`;
        if (!image) image = h.products.product_images[0]?.url ?? FALLBACK_HIGHLIGHT_IMAGE;
      } else {
        if (!href) href = "/shop";
        if (!image) image = FALLBACK_HIGHLIGHT_IMAGE;
      }

      return {
        id: h.id,
        href,
        image,
        label,
        alt,
        subtitle: h.subtitle,
      };
    });

  const categories: HomeCategoryTile[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return <Home heroSlides={heroSlides} highlights={highlights} categories={categories} />;
}
