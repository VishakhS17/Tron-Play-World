"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";

export type HeroSlide = {
  id: string;
  image_url: string;
  title?: string | null;
  link_url?: string | null;
};

const FALLBACK_SLIDES: HeroSlide[] = [
  { id: "f1", image_url: "/images/banners/banner 1.png", title: "Banner 1" },
  { id: "f2", image_url: "/images/banners/banner 2.png", title: "Banner 2" },
  { id: "f3", image_url: "/images/banners/banner 3.png", title: "Banner 3" },
];

const AUTO_ROTATE_INTERVAL = 7000;
const SWIPE_THRESHOLD = 50;

function isRemoteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

type Props = {
  slides?: HeroSlide[];
};

const HeroBannerCarousel = ({ slides: slidesProp }: Props) => {
  const slides = slidesProp && slidesProp.length > 0 ? slidesProp : FALLBACK_SLIDES;
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides]);

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

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX < 0) goToNext();
    else goToPrev();
  };

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
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((banner, index) => (
            <div key={banner.id} className="relative min-w-full h-full">
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
    </div>
  );
};

export default HeroBannerCarousel;
