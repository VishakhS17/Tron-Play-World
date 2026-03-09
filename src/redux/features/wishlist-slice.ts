import { WishlistItem } from '@/types/wishlistItem';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

// Load wishlist items from local storage if available
let initialItemsState: WishlistItem[] = [];

export const wishlist = createSlice({
  name: 'wishlist',
  initialState: { items: initialItemsState },
  reducers: {
    setWishlistItems: (state, action: PayloadAction<WishlistItem[]>) => {
      state.items = action.payload;
    },
    addItemToWishlist: (state, action: PayloadAction<WishlistItem>) => {
      const {
        id,
        title,
        price,
        slug,
        image,
        quantity,
        color
      } = action.payload;
      const existingItem = state.items.find((item) => item.id === id);

      if (existingItem) {
        state.items = state.items.filter((item) => item.id !== id);
        toast.error('Product removed from wishlist!');
        return;
      } else {
        state.items.push({
          id,
          title,
          slug,
          image,
          price,
          quantity,
          color
        });

        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('wishlistItems', JSON.stringify(state.items));
        }
        toast.success('Product added to wishlist!');
      }
    },
    removeItemFromWishlist: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      state.items = state.items.filter((item) => item.id !== itemId);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('wishlistItems', JSON.stringify(state.items));
      }
    },
    removeAllItemsFromWishlist: (state) => {
      state.items = [];
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('wishlistItems', JSON.stringify(state.items));
      }
    },
  },
});

export const {
  addItemToWishlist,
  removeItemFromWishlist,
  removeAllItemsFromWishlist,
  setWishlistItems
} = wishlist.actions;
export default wishlist.reducer;
