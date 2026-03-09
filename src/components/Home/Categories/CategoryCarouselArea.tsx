"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { SwiperRef } from "swiper/react";

// Import Swiper styles
import { ChevronLeftIcon, ChevronRightIcon } from "@/assets/icons";
import "swiper/css";
import "swiper/css/navigation";
import SingleItem from "./SingleItem";
import { Category } from "@prisma/client";

export default function CategoryCarouselArea({
  categories,
}: {
  categories: Category[];
}) {
  const sliderRef = useRef<SwiperRef>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnd, setIsEnd] = useState(false);

  const handlePrev = useCallback(() => {
    if (!sliderRef.current?.swiper) return;
    sliderRef.current.swiper.slidePrev();
  }, []);

  const handleNext = useCallback(() => {
    if (!sliderRef.current?.swiper) return;
    sliderRef.current.swiper.slideNext();
  }, []);

  useEffect(() => {
    if (sliderRef.current) {
      // @ts-ignore
      sliderRef.current.swiper.init();
    }
  }, []);
  const onSlideChange = useCallback(() => {
    if (sliderRef.current?.swiper) {
      setCurrentIndex(sliderRef.current.swiper.activeIndex);
      setIsEnd(sliderRef.current.swiper.isEnd);
    }
  }, []);
  return (
    <div className="swiper categories-carousel common-carousel">
      {/* <!-- section title --> */}
      <div className="flex items-center justify-between mb-16">
        <div>
          <h2 className="text-xl font-semibold xl:text-heading-5 text-dark">
            Browse by Category
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className={`swiper-button-prev ${
              currentIndex === 0 ? "opacity-50 pointer-events-none" : ""
            }`}
            aria-label="previous button"
            disabled={currentIndex === 0}
          >
            <ChevronLeftIcon />
          </button>

          <button
            onClick={handleNext}
            className={`swiper-button-next ${
              isEnd ? "opacity-50 pointer-events-none" : ""
            }`}
            aria-label="next button"
            disabled={isEnd}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <Swiper
        ref={sliderRef}
        slidesPerView={6}
        onSlideChange={onSlideChange}
        breakpoints={{
          // when window width is >= 640px
          0: {
            slidesPerView: 2,
          },
          1000: {
            slidesPerView: 4,
            // spaceBetween: 4,
          },
          // when window width is >= 768px
          1200: {
            slidesPerView: 6,
          },
        }}
      >
        {categories.length > 0 &&
          categories.map((item, key) => (
            <SwiperSlide key={key}>
              <SingleItem item={item} />
            </SwiperSlide>
          ))}
      </Swiper>
    </div>
  );
}
