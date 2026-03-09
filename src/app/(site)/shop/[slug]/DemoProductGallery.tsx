"use client";

import Image from "next/image";
import { useRef, useState, type TouchEvent } from "react";

const SWIPE_THRESHOLD = 40;

type Props = {
  title: string;
  images: string[];
};

export default function DemoProductGallery({ title, images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = (index: number) => {
    const total = images.length;
    setActiveIndex(((index % total) + total) % total);
  };

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
    if (deltaX < 0) goTo(activeIndex + 1);
    else goTo(activeIndex - 1);
  };

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-square rounded-2xl border border-gray-3 overflow-hidden bg-white touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={images[activeIndex]}
          alt={`${title} image ${activeIndex + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-4"
          priority
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.slice(0, 3).map((thumbnail, index) => (
          <button
            key={thumbnail}
            type="button"
            onClick={() => goTo(index)}
            className={`relative aspect-square rounded-xl border overflow-hidden bg-white ${
              activeIndex === index ? "border-blue" : "border-gray-3"
            }`}
            aria-label={`Show image ${index + 1}`}
          >
            <Image
              src={thumbnail}
              alt={`${title} thumbnail ${index + 1}`}
              fill
              sizes="(max-width: 1024px) 33vw, 16vw"
              className="object-contain p-2"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

