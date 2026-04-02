"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";

export type HeroSlide = {
  id: string;
  image_url: string;
  title?: string | null;
  link_url?: string | null;
};

const AUTO_ROTATE_INTERVAL = 7000;
const SWIPE_THRESHOLD = 50;

function isRemoteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

type Props = {
  slides?: HeroSlide[];
};

const HeroBannerCarousel = ({ slides: slidesProp }: Props) => {
  const slides = slidesProp && slidesProp.length > 0 ? slidesProp : [];
  const slidesKey = useMemo(() => slides.map((s) => s.id).join("|"), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) =>
      slides.length > 0 ? (prev + 1) % slides.length : 0
    );
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) =>
      slides.length > 0 ? (prev - 1 + slides.length) % slides.length : 0
    );
  }, [slides.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slidesKey]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      goToNext();
    }, AUTO_ROTATE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [goToNext, slides.length]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;

    const touchEndX = event.changedTouches[0]?.clientX;
    if (typeof touchEndX !== "number") return;

    const deltaX = touchEndX - touchStartX.current;
    touchStartX.current = null;

    if (slides.length < 2) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX < 0) goToNext();
    else goToPrev();
  };

  if (slides.length === 0) {
    return (
      <div
        className="relative flex w-full aspect-[3/2] lg:aspect-[3/1] items-center justify-center bg-gray-1 border-b border-gray-3"
        aria-label="Hero banner area"
      >
        <p className="max-w-md px-4 text-center text-sm leading-relaxed text-meta-3">
          No hero banners yet. Add slides under{" "}
          <span className="font-medium text-dark">Admin → Marketing → Hero</span>.
        </p>
      </div>
    );
  }

  const slideFraction = 100 / slides.length;
  const showArrows = slides.length > 1;

  return (
    <div
      className="relative w-full aspect-[3/2] lg:aspect-[3/1] touch-pan-y"
      aria-roledescription="carousel"
      aria-label="Hero banner carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${activeIndex * slideFraction}%)`,
          }}
        >
          {slides.map((banner, index) => (
            <div
              key={banner.id}
              className="relative h-full shrink-0"
              style={{ width: `${slideFraction}%` }}
            >
              {banner.link_url ? (
                <Link href={banner.link_url} className="relative block h-full w-full">
                  <Image
                    src={banner.image_url}
                    alt={banner.title ?? "Hero banner"}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                    unoptimized={isRemoteUrl(banner.image_url)}
                  />
                </Link>
              ) : (
                <Image
                  src={banner.image_url}
                  alt={banner.title ?? "Hero banner"}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover"
                  unoptimized={isRemoteUrl(banner.image_url)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {showArrows ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              goToPrev();
            }}
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-[2px] transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-4 sm:h-11 sm:w-11"
            aria-label="Previous banner"
          >
            <ChevronLeftIcon className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              goToNext();
            }}
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-[2px] transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-4 sm:h-11 sm:w-11"
            aria-label="Next banner"
          >
            <ChevronRightIcon className="size-6" />
          </button>
        </>
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2 sm:bottom-4"
        role="tablist"
        aria-label="Banner slides"
      >
        {slides.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Banner ${index + 1} of ${slides.length}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveIndex(index);
            }}
            className={`pointer-events-auto h-2.5 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              index === activeIndex
                ? "w-8 bg-white shadow-sm"
                : "w-2.5 bg-white/55 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBannerCarousel;
