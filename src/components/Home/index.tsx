import Image from "next/image";
import HeroBannerCarousel from "./HeroBannerCarousel";

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
const COLLECTION_SPOTLIGHTS = [
  {
    src: "/images/collections/693c2377f0a417e6ed0a3758-rc-cars-1-14-all-terrain-rc-car-for.jpg",
    alt: "RC Cars",
    label: "RC Cars",
  },
  {
    src: "/images/collections/35984-1024__79878.jpg",
    alt: "Hotwheels",
    label: "Hotwheels",
  },
  {
    src: "/images/collections/05248246-75A5-4A35-90E2-B4A1DDFB89B6.jpg",
    alt: "Die Cast Cars",
    label: "Die Cast Cars",
  },
];
const VISIT_US_MAP_URL = "https://maps.app.goo.gl/GqXJNknzeg9wXJjT9";
const VISIT_US_EMBED_DESKTOP_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3757.0776325542147!2d77.56174517491753!3d12.925243587385886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae150072e599c7%3A0x508be3c9c2d61e89!2sTron%20Play%20World!5e1!3m2!1sen!2sin!4v1773039262238!5m2!1sen!2sin";
const VISIT_US_EMBED_MOBILE_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3757.0776325542147!2d77.56174517491753!3d12.925243587385886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae150072e599c7%3A0x508be3c9c2d61e89!2sTron%20Play%20World!5e1!3m2!1sen!2sin!4v1773039262238!5m2!1sen!2sin";

const Home = () => {
  return (
    <main className="bg-white">
      {/* Hero / banner area */}
      <section className="relative overflow-hidden pt-32">
        <HeroBannerCarousel />
      </section>

      {/* Made for collectors / feature strip */}
      <section className="py-14 bg-white">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="max-w-2xl mx-auto mb-10 text-center">
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
              Section tagline placeholder
            </p>
            <h2 className="mb-3 text-2xl font-semibold sm:text-3xl text-dark">
              Designed for collectors, tuned for everyday browsing.
            </h2>
            <p className="text-sm leading-relaxed text-meta-3 sm:text-base">
              Use this section to explain how your catalog is organized. Each
              card below can later link to a highlight category, story, or
              landing page.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {COLLECTION_SPOTLIGHTS.map((item) => (
              <button
                key={item.src}
                type="button"
                className="group relative overflow-hidden rounded-2xl border border-gray-3 bg-white shadow-md shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-red/40 active:scale-[0.98] active:translate-y-0"
                aria-label={item.alt}
              >
                <div className="relative aspect-[4/3] md:aspect-[5/4]">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-3 bottom-3 rounded-lg bg-red/90 px-3 py-2 shadow-md shadow-red/30 transition-all duration-300 group-hover:bg-red group-hover:shadow-lg group-hover:shadow-red/40">
                    <p className="text-sm font-bold text-white tracking-wide">
                      {item.label}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by brand – horizontal cards, no JS carousel */}
      <section className="py-14 bg-gray-1 border-y border-gray-3">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
                Placeholder: brand rail
              </p>
              <h2 className="text-xl font-semibold text-dark xl:text-heading-5">
                Browse by maker or universe.
              </h2>
              <p className="mt-1 text-sm text-meta-3">
                This row is reserved for your key brands once they are ready.
              </p>
            </div>
            <p className="text-xs text-meta-4 sm:text-sm">
              Scroll sideways on mobile to see more brands.
            </p>
          </div>

          <div className="relative">
            <div className="flex gap-4 px-1 pb-2 overflow-x-auto sm:px-0 sm:gap-5 no-scrollbar">
              {BRAND_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="min-w-[200px] sm:min-w-[240px] flex flex-col"
                >
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
                    <span className="text-xs sm:text-sm font-semibold text-dark">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Shop by category – simple grid to keep DOM light */}
      <section className="py-14 bg-white">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
                Placeholder: categories
              </p>
              <h2 className="text-xl font-semibold text-dark xl:text-heading-5">
                Discover by category.
              </h2>
              <p className="mt-1 text-sm text-meta-3">
                Each tile below can later map directly to one of your main
                catalog categories.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col justify-between h-full px-4 py-5 rounded-2xl bg-gray-1 border border-gray-3"
              >
                <h3 className="text-sm font-semibold text-dark sm:text-base">
                  Category placeholder {index + 1}
                </h3>
                <p className="mt-2 text-[11px] text-meta-3">
                  Short label that hints at what lives under this category.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visit us section */}
      <section className="py-16 bg-white">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,_1.2fr)_minmax(0,_1fr)]">
            {/* Embedded map */}
            <div className="overflow-hidden border rounded-2xl border-gray-3 bg-gray-1">
              <iframe
                src={VISIT_US_EMBED_DESKTOP_URL}
                title="Store location map"
                className="hidden w-full border-0 md:block"
                width="680"
                height="510"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
              <iframe
                src={VISIT_US_EMBED_MOBILE_URL}
                title="Store location map mobile"
                className="block w-full border-0 md:hidden"
                width="360"
                height="270"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Store details placeholder */}
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.18em] uppercase text-blue">
                Visit us
              </p>
              <h2 className="mb-3 text-2xl font-semibold sm:text-3xl text-dark">
                Plan a visit to your flagship space.
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-meta-3 sm:text-base">
                Use this area to describe where visitors can find you, how your
                physical space is laid out, or what makes the in-store
                experience special.
              </p>

              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-dark">Store name</dt>
                  <dd className="mt-1 text-meta-3">
                    Tron Play World
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-dark">Address</dt>
                  <dd className="mt-1 text-meta-3">
                    24, Basement, 21st Main Rd, Banashankari Stage II,
                    Banashankari, Bengaluru, Karnataka 560070
                  </dd>
                </div>
              </dl>

              <div className="mt-8">
                <a
                  href={VISIT_US_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white rounded-lg bg-blue hover:bg-blue-dark transition-colors"
                >
                  Get directions
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
