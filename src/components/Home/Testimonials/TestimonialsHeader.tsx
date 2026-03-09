import { ChevronLeftIcon, ChevronRightIcon } from "@/assets/icons";

interface TestimonialsHeaderProps {
  onPrev: () => void;
  onNext: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
}

const TestimonialsHeader = ({
  onPrev,
  onNext,
  isPrevDisabled,
  isNextDisabled,
}: TestimonialsHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-10">
      <div>
        <h2 className="text-xl font-semibold xl:text-heading-5 text-dark">
          User Feedbacks
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          className={`swiper-button-prev transition-opacity ${
            isPrevDisabled ? "opacity-50 pointer-events-none" : ""
          }`}
          aria-label="Previous testimonial"
          disabled={isPrevDisabled}
        >
          <ChevronLeftIcon />
        </button>

        <button
          onClick={onNext}
          className={`swiper-button-next transition-opacity ${
            isNextDisabled ? "opacity-50 pointer-events-none" : ""
          }`}
          aria-label="Next testimonial"
          disabled={isNextDisabled}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
};

export default TestimonialsHeader;
