"use client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loadCartFromStorage as loadCartFromStorageAction } from "@/redux/features/cart-slice";
import { loadCartFromStorage, setStorageScope } from "@/lib/cartStorage";
import { getWishlistStorageKey, setWishlistItems } from "@/redux/features/wishlist-slice";

/**
 * CartHydration component loads cart from localStorage after initial render
 * This prevents SSR hydration mismatches
 */
export default function CartHydration() {
    const dispatch = useDispatch();

    useEffect(() => {
        const hydrateByScope = async () => {
            let scope = "guest";
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                const data = await res.json().catch(() => null);
                const userId = data?.user?.id as string | undefined;
                scope = userId || "guest";
            } catch {
                scope = "guest";
            }

            setStorageScope(scope);

            const savedCart = loadCartFromStorage();
            dispatch(loadCartFromStorageAction(savedCart));

            try {
                const raw = localStorage.getItem(getWishlistStorageKey());
                const wishlist = raw ? JSON.parse(raw) : [];
                dispatch(setWishlistItems(Array.isArray(wishlist) ? wishlist : []));
            } catch {
                dispatch(setWishlistItems([]));
            }
        };

        void hydrateByScope();

        const handleAuthChange = () => {
            void hydrateByScope();
        };
        window.addEventListener("tpw-auth-changed", handleAuthChange);

        return () => {
            window.removeEventListener("tpw-auth-changed", handleAuthChange);
        };
    }, [dispatch]);

    return null; // This component doesn't render anything
}
