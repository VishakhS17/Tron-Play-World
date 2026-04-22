import Image from "next/image";
import Link from "next/link";
import HeroBannerCarousel, { type HeroSlide } from "./HeroBannerCarousel";
import HomeHighlightsSection from "./HomeHighlightsSection";

export type HomeBrandRailItem = {
  id: string;
  href: string;
  image: string;
  label: string;
  alt: string;
};

export type HomeHighlightCard = {
  id: string;
  href: string;
  image: string;
  label: string;
  alt: string;
  subtitle?: string | null;
};

export type HomeCategoryTile = {
  id: string;
  name: string;
  slug: string;
  /** Set when tile is managed in Admin → Marketing (Discover by category). */
  image?: string | null;
};

type HomeProps = {
  heroSlides?: HeroSlide[];
  highlights?: HomeHighlightCard[];
  brandRail?: HomeBrandRailItem[];
  categories?: HomeCategoryTile[];
};

function isRemoteImage(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

const Home = ({
  heroSlides,
  highlights,
  brandRail,
  categories,
}: HomeProps) => {
  const spotlightItems =
    highlights && highlights.length > 0
      ? highlights
      : null;

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden pt-32">
        <HeroBannerCarousel slides={heroSlides} />
      </section>

      <section className="py-14 bg-white">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="max-w-2xl mx-auto mb-10 text-center">
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
              Highlights
            </p>
            <h2 className="mb-3 text-2xl font-semibold sm:text-3xl text-dark">
              Featured collections and picks.
            </h2>
            <p className="text-sm leading-relaxed text-meta-3 sm:text-base">
              Cards below are managed in Admin → Marketing (featured, trending, categories, or
              individual products).
            </p>
          </div>

          <HomeHighlightsSection items={spotlightItems} />
        </div>
      </section>

      <section className="py-14 bg-gray-1 border-y border-gray-3">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
                Shop by brand
              </p>
              <h2 className="text-xl font-semibold text-dark xl:text-heading-5">
                Browse by maker or universe.
              </h2>
              <p className="mt-1 text-sm text-meta-3">
                Tiles and images are managed in Admin → Marketing → Shop by brand.
              </p>
            </div>
            <p className="text-xs text-meta-4 sm:text-sm">
              Scroll sideways on mobile to see more brands.
            </p>
          </div>

          <div className="relative">
            <div className="flex gap-4 px-1 pb-2 overflow-x-auto sm:px-0 sm:gap-5 no-scrollbar">
              {brandRail && brandRail.length > 0 ? (
                brandRail.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="min-w-[200px] sm:min-w-[240px] flex flex-col shrink-0 text-left"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.alt}
                        fill
                        sizes="(max-width: 640px) 200px, 240px"
                        className="object-cover rounded-2xl"
                        unoptimized={isRemoteImage(item.image)}
                      />
                    </div>
                    <div className="mt-2 w-full rounded-xl bg-white border border-gray-3 px-3 py-2 shadow-sm flex items-center justify-center">
                      <span className="text-xs sm:text-sm font-semibold text-dark text-center">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-meta-3 py-4">
                  No brand tiles yet — add them under Admin → Marketing → Shop by brand.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
                Categories
              </p>
              <h2 className="text-xl font-semibold text-dark xl:text-heading-5">
                Discover by category.
              </h2>
              <p className="mt-1 text-sm text-meta-3">
                Choose categories, order, and photos in Admin → Marketing → Discover by category. If none
                are configured, the first eight catalog categories show here without images.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories && categories.length > 0 ? (
              categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                  className="flex flex-col h-full overflow-hidden rounded-2xl bg-gray-1 border border-gray-3 hover:border-blue/40 hover:shadow-sm transition"
                >
                  {cat.image ? (
                    <div className="relative aspect-[5/3] w-full shrink-0 bg-gray-2">
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                        unoptimized={isRemoteImage(cat.image)}
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-col flex-1 justify-between px-4 py-4">
                    <h3 className="text-sm font-semibold text-dark sm:text-base">{cat.name}</h3>
                    <p className="mt-2 text-[11px] text-meta-3">View products in this category.</p>
                  </div>
                </Link>
              ))
            ) : (
              Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col justify-between h-full px-4 py-5 rounded-2xl bg-gray-1 border border-gray-3"
                >
                  <h3 className="text-sm font-semibold text-dark sm:text-base">
                    Category placeholder {index + 1}
                  </h3>
                  <p className="mt-2 text-[11px] text-meta-3">
                    Add categories in admin to populate this grid.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

    </main>
  );
};

export default Home;
