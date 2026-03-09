import Image from "next/image";
import Link from "next/link";
import LargePromoBanner from "./LargePromoBanner";
import SmallPromoBanner from "./SmallPromoBanner";

const TreadmillPromoBanner = () => {
  return (
    <div className="relative z-1 overflow-hidden rounded-lg bg-[#DBF4F3] py-10 xl:py-16 px-4 sm:px-7.5 xl:px-10">
      <Image
        src="/images/products/product-7-bg-1.png"
        alt="promo img"
        className="absolute -translate-y-1/2 top-1/2 left-3 sm:left-10 -z-1"
        width={241}
        height={241}
      />
      <div className="text-right">
        <span className="block text-lg text-dark mb-1.5">
          Foldable Motorised Treadmill
        </span>
        <h2 className="font-bold text-xl lg:text-heading-4 text-dark mb-2.5">
          Workout At Home
        </h2>
        <p className="font-semibold text-custom-1 text-teal">Flat 20% off</p>
        <Link
          href="#"
          className="inline-flex font-medium text-custom-sm text-white bg-teal py-2.5 px-8.5 rounded-md ease-out duration-200 hover:bg-teal-dark mt-9"
        >
          Grab Now
        </Link>
      </div>
    </div>
  );
};

const WatchPromoBanner = () => {
  return (
    <div className="relative z-1 overflow-hidden rounded-lg bg-[#FFECE1] py-10 xl:py-16 px-4 sm:px-7.5 xl:px-10">
      <Image
        src="/images/promo/promo-03.png"
        alt="promo img"
        className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-8.5 -z-1"
        width={200}
        height={200}
      />
      <div>
        <span className="block text-lg text-dark mb-1.5">
          Apple Watch Ultra
        </span>
        <h2 className="font-bold text-xl lg:text-heading-4 text-dark mb-2.5">
          Up to <span className="text-orange">40%</span> off
        </h2>
        <p className="max-w-[285px] text-custom-sm">
          The aerospace-grade titanium case strikes the perfect balance of
          everything.
        </p>
        <Link
          href={`/products/apple-watch-ultra`}
          className="inline-flex font-medium text-custom-sm text-white bg-orange py-2.5 px-8.5 rounded-md ease-out duration-200 hover:bg-orange-dark mt-7.5"
        >
          Buy Now
        </Link>
      </div>
    </div>
  );
};

const PromoBanner = () => {
  return (
    <section className="py-20 overflow-hidden">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <LargePromoBanner
          imageUrl="/images/promo/promo-01.png"
          subtitle="Apple iPhone 14 Plus"
          title="UP TO 30% OFF"
          description="iPhone 14 has the same superspeedy chip that's in iPhone 13 Pro, A15 Bionic, with a 5‑core GPU, powers all the latest features."
          link="iphone-14-plus--6128gb"
          buttonText="Purchase Now"
        />
        <div className="grid gap-7.5 grid-cols-1 lg:grid-cols-2">
          <SmallPromoBanner
            imageUrl="/images/promo/promo-02.png"
            subtitle="Foldable Motorised Treadmill"
            title="Workout At Home"
            discount="Flat 20% off"
            link="iphone-14-plus--6128gb"
            buttonText="Grab the deal"
          />

          <SmallPromoBanner
            imageUrl="/images/promo/promo-03.png"
            subtitle="Apple Watch Ultra"
            title="Up to 40% off"
            description="The aerospace-grade titanium case strikes the perfect balance of everything."
            link="/products/apple-watch-ultra"
            buttonText="Grab the deal"
          />
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
