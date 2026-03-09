import { FullStarIcon, HalfStarIcon, EmptyStarIcon } from '@/assets/icons';

const ReviewStar = ({ avgRating }: { avgRating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, index) => {
        const rating = index + 1;
        if (avgRating >= rating) return <FullStarIcon key={index} />;
        if (avgRating >= rating - 0.5) return <HalfStarIcon key={index} />;
        return <EmptyStarIcon key={index} />;
      })}
    </div>
  );
};

export default ReviewStar;
