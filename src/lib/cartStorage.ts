import { CartItem } from "@/redux/features/cart-slice";

const CART_STORAGE_KEY = "tron-play-world-cart";

/**
 * Save cart items to localStorage
 */
export const saveCartToStorage = (items: CartItem[]): void => {
    try {
        const serializedCart = JSON.stringify(items);
        localStorage.setItem(CART_STORAGE_KEY, serializedCart);
    } catch (error) {
        // Handle quota exceeded or other localStorage errors
        if (error instanceof Error) {
            if (error.name === "QuotaExceededError") {
                console.error("LocalStorage quota exceeded. Unable to save cart.");
            } else if (error.name === "SecurityError") {
                console.error("LocalStorage access denied (private browsing mode?).");
            } else {
                console.error("Failed to save cart to localStorage:", error.message);
            }
        }
    }
};

/**
 * Load cart items from localStorage
 */
export const loadCartFromStorage = (): CartItem[] => {
    try {
        const serializedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (serializedCart === null) {
            return [];
        }
        return JSON.parse(serializedCart) as CartItem[];
    } catch (error) {
        // Handle JSON parse errors or localStorage access errors
        if (error instanceof Error) {
            console.error("Failed to load cart from localStorage:", error.message);
        }
        return [];
    }
};

/**
 * Clear cart data from localStorage
 */
export const clearCartStorage = (): void => {
    try {
        localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
        if (error instanceof Error) {
            console.error("Failed to clear cart from localStorage:", error.message);
        }
    }
};
