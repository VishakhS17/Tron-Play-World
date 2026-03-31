import Image from "next/image";
import Link from "next/link";
import HeroBannerCarousel, { type HeroSlide } from "./HeroBannerCarousel";

const BRAND_ITEMS = [
  {
    src: "/images/New folder/Untitled design (1).png",
    label: "Hot Wheels",
  },
  {
    src: "/images/New folder/Untitled design (2).png",
    label: "MiniGT",
  },
  {
    src: "/images/New folder/Untitled design (3).png",
    label: "PopRace",
  },
  {
    src: "/images/New folder/Untitled design (4).png",
    label: "CM Model",
  },
  {
    src: "/images/New folder/Untitled design (5).png",
    label: "TIMEMICRO",
  },
];

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
};

type HomeProps = {
  heroSlides?: HeroSlide[];
  highlights?: HomeHighlightCard[];
  categories?: HomeCategoryTile[];
};

function isRemoteImage(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

const Home = ({ heroSlides, highlights, categories }: HomeProps) => {
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

          <div className="grid gap-6 md:grid-cols-3">
            {spotlightItems ? (
              spotlightItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group relative overflow-hidden rounded-2xl border border-gray-3 bg-white shadow-md shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-red/40 active:scale-[0.98] active:translate-y-0 text-left"
                >
                  <div className="relative aspect-[4/3] md:aspect-[5/4]">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                      unoptimized={isRemoteImage(item.image)}
                    />
                    <div className="absolute inset-x-3 bottom-3 rounded-lg bg-red/90 px-3 py-2 shadow-md shadow-red/30 transition-all duration-300 group-hover:bg-red group-hover:shadow-lg group-hover:shadow-red/40">
                      <p className="text-sm font-bold text-white tracking-wide">{item.label}</p>
                      {item.subtitle ? (
                        <p className="mt-0.5 text-[11px] font-medium text-white/90 line-clamp-2">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-meta-3 md:col-span-3 text-center py-6">
                No active homepage highlights — add some under Admin → Marketing.
              </p>
            )}
          </div>
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
                Brand rail — swap images or wire to catalog brands when ready.
              </p>
            </div>
            <p className="text-xs text-meta-4 sm:text-sm">
              Scroll sideways on mobile to see more brands.
            </p>
          </div>

          <div className="relative">
            <div className="flex gap-4 px-1 pb-2 overflow-x-auto sm:px-0 sm:gap-5 no-scrollbar">
              {BRAND_ITEMS.map((item, index) => (
                <div key={index} className="min-w-[200px] sm:min-w-[240px] flex flex-col">
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={item.src}
                      alt={item.label}
                      fill
                      sizes="(max-width: 640px) 200px, 240px"
                      className="object-cover rounded-2xl"
                    />
                  </div>
                  <div className="mt-2 inline-flex items-center justify-center rounded-xl bg-white border border-gray-3 px-3 py-2 shadow-sm">
                    <span className="text-xs sm:text-sm font-semibold text-dark">{item.label}</span>
                  </div>
                </div>
              ))}
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
                Pulled from your catalog (up to eight).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories && categories.length > 0 ? (
              categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                  className="flex flex-col justify-between h-full px-4 py-5 rounded-2xl bg-gray-1 border border-gray-3 hover:border-blue/40 hover:shadow-sm transition"
                >
                  <h3 className="text-sm font-semibold text-dark sm:text-base">{cat.name}</h3>
                  <p className="mt-2 text-[11px] text-meta-3">View products in this category.</p>
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

      <section className="py-16 bg-white">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="rounded-2xl border border-gray-3 bg-gray-1 p-6 sm:p-8">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
                Visit us
              </p>
              <h2 className="mb-3 text-2xl font-semibold sm:text-3xl text-dark">
                Find us in Bengaluru.
              </h2>

              <dl className="space-y-4 text-sm rounded-xl border border-gray-3 bg-white p-5">
                <div>
                  <dt className="font-semibold text-dark">Location</dt>
                  <dd className="mt-1 text-meta-3">
                    24, Basement, 21st Main Rd, Banashankari Stage II, Banashankari, Bengaluru,
                    Karnataka 560070
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
