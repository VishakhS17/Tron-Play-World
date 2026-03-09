import { HeartFilledIcon, HeartIcon, HeartSolid } from "@/assets/icons";
import { useAppSelector } from "@/redux/store";
import { Product } from "@/types/product";
import { useEffect, useState } from "react";
import Tooltip from "../Common/Tooltip";

// prop type
type IProps = {
  item: Product;
  handleItemToWishList: () => void;
};

const WishlistButton = ({ item, handleItemToWishList }: IProps) => {
  const wishlistItems = useAppSelector((state) => state.wishlistReducer.items);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null; // Avoid hydration issues by not rendering mismatched content
  }

  const isAlreadyWishListed = wishlistItems.some(
    (wishlistItem) => wishlistItem.id === item.id
  );

  return (
    <Tooltip content="Wishlist" placement="top">
      <button
        onClick={handleItemToWishList}
        aria-label="button for favorite select"
        className="flex items-center justify-center duration-200 h-[38px] w-[38px] ease-out bg-white border rounded-lg border-gray-3   text-dark hover:text-blue"
      >
        {isAlreadyWishListed ? (
          <HeartSolid />
        ) : (
          <HeartIcon width={16} height={16} />
        )}
      </button>
    </Tooltip>
  );
};

export default WishlistButton;
