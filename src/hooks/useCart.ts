import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/redux/store";
import {
    addItemToCart,
    removeItemFromCart,
    incrementItem,
    decrementItem,
    clearCart,
    toggleCartModal,
    selectCartCount,
    selectCartDetails,
    selectTotalPrice,
    selectFormattedTotalPrice,
    selectShouldDisplayCart,
    CartItem,
} from "@/redux/features/cart-slice";
import { clearCartStorage } from "@/lib/cartStorage";

export const useCart = () => {
    const dispatch = useDispatch<AppDispatch>();

    // Selectors
    const cartCount = useSelector(selectCartCount);
    const cartDetails = useSelector(selectCartDetails);
    const totalPrice = useSelector(selectTotalPrice);
    const formattedTotalPrice = useSelector(selectFormattedTotalPrice);
    const shouldDisplayCart = useSelector(selectShouldDisplayCart);

    // Actions
    const addItem = (item: CartItem) => {
        dispatch(addItemToCart(item));
    };

    const removeItem = (id: string | number) => {
        dispatch(removeItemFromCart(id));
    };

    const incrementItemQuantity = (id: string | number) => {
        dispatch(incrementItem(id));
    };

    const decrementItemQuantity = (id: string | number) => {
        dispatch(decrementItem(id));
    };

    const clearAllItems = () => {
        dispatch(clearCart());
        clearCartStorage();
    };

    const handleCartClick = () => {
        dispatch(toggleCartModal());
    };

    return {
        // State
        cartCount,
        cartDetails,
        totalPrice,
        formattedTotalPrice,
        shouldDisplayCart,

        // Actions
        addItem,
        removeItem,
        incrementItem: incrementItemQuantity,
        decrementItem: decrementItemQuantity,
        clearCart: clearAllItems,
        handleCartClick,
    };
};
