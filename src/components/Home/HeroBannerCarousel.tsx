"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type TouchEvent } from "react";

type Banner = {
  id: number;
  src: string;
  alt: string;
};

const BANNERS: Banner[] = [
  {
    id: 1,
    src: "/images/banners/banner 1.png",
    alt: "Banner 1",
  },
  {
    id: 2,
    src: "/images/banners/banner 2.png",
    alt: "Banner 2",
  },
  {
    id: 3,
    src: "/images/banners/banner 3.png",
    alt: "Banner 3",
  },
];

const AUTO_ROTATE_INTERVAL = 7000;
const SWIPE_THRESHOLD = 50;

const HeroBannerCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % BANNERS.length);
  };

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      goToNext();
    }, AUTO_ROTATE_INTERVAL);

    return () => window.clearInterval(timer);
  }, []);

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
          {BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className="relative min-w-full h-full"
              aria-hidden="true"
            >
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroBannerCarousel;

