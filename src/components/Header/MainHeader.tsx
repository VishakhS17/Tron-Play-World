"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { menuData } from "./menuData";
import MobileMenu from "./MobileMenu";
import DesktopMenu from "./DesktopMenu";
import {
  SearchIcon,
  UserIcon,
  HeartIcon,
  CartIcon,
  MenuIcon,
  CloseIcon,
} from "./icons";
import { HeaderSetting } from "@prisma/client";
import { useAppSelector } from "@/redux/store";

type IProps = {
  headerData?: HeaderSetting | null;
};

type MeResponse = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    roles: string[];
  } | null;
};

const MainHeader = ({ headerData }: IProps) => {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [stickyMenu, setStickyMenu] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const { handleCartClick, cartCount, totalPrice } = useCart();
  const wishlistCount = useAppSelector((state) => state.wishlistReducer).items
    ?.length;

  const handleOpenCartModal = () => {
    handleCartClick();
  };

  // Sticky menu
  const handleStickyMenu = () => {
    if (window.scrollY >= 80) {
      setStickyMenu(true);
    } else {
      setStickyMenu(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleStickyMenu);
    return () => {
      window.removeEventListener("scroll", handleStickyMenu);
    };
  }, []);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setNavigationOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Read current customer session for greeting text
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as MeResponse | null;
        if (!mounted) return;
        const rawName = data?.user?.name?.trim();
        const fallback = data?.user?.email?.split("@")[0] ?? null;
        setUserName(rawName || fallback);
      } catch {
        if (mounted) setUserName(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <header
        className={`fixed left-0 top-0 w-full z-50 bg-white transition-all  ease-in-out duration-300 ${stickyMenu && "shadow-sm"
          }`}
      >
        {/* Announcement bar */}
        <div className="bg-gray-1 py-2.5 border-b border-gray-3">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 xl:px-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm font-medium text-dark">
                Minimum order value for free shipping: <span className="font-semibold">₹2000</span>
              </p>
              {userName ? (
                <Link
                  href="/account"
                  className="text-xs sm:text-sm font-medium text-blue hover:underline"
                >
                  Welcome, {userName}!
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-medium text-blue hover:underline"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Running promo banner */}
        <div className="bg-white border-b border-gray-3 overflow-hidden">
          <div className="relative">
            <div className="whitespace-nowrap text-xs sm:text-sm font-medium text-dark py-2 animate-[marquee_18s_linear_infinite]">
              <span className="mx-6">Use code <b>WELCOME10</b> for 10% off</span>
              <span className="mx-6">Free shipping over <b>₹2000</b></span>
              <span className="mx-6">New arrivals added weekly</span>
              <span className="mx-6">Use code <b>WELCOME10</b> for 10% off</span>
              <span className="mx-6">Free shipping over <b>₹2000</b></span>
              <span className="mx-6">New arrivals added weekly</span>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="px-4 mx-auto max-w-7xl sm:px-6 xl:px-0">
          <div className="flex items-center justify-between py-4 xl:py-0">
            {/* Logo */}
            <div>
              <Link className="block py-2 shrink-0" href="/">
                <Image
                  src={
                    headerData?.headerLogo ||
                    "/images/logo/ChatGPT Image Mar 3, 2026, 09_30_51 PM.png"
                  }
                  alt="Site logo"
                  width={160}
                  height={160}
                  priority
                />
              </Link>
            </div>

            {/* Desktop Menu - Hidden on mobile */}
            <div className="hidden xl:block">
              <DesktopMenu menuData={menuData} />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                className="transition hover:text-blue focus:outline-none"
                onClick={() => setSearchModalOpen(true)}
                aria-label="Search"
              >
                <SearchIcon />
              </button>

              <Link
                href="/account"
                className="transition hover:text-blue focus:outline-none"
                aria-label="Account"
              >
                <UserIcon />
              </Link>

              <Link
                href="/wishlist"
                className="relative text-gray-700 transition hover:text-blue focus:outline-none"
                aria-label="Wishlist"
              >
                <HeartIcon />
                <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] text-white bg-red-600 text-[10px] font-normal rounded-full inline-flex items-center justify-center">
                  {wishlistCount}
                </span>
              </Link>

              <button
                className="relative text-gray-700 transition hover:text-blue focus:outline-none"
                onClick={handleOpenCartModal}
                aria-label="Cart"
              >
                <CartIcon />
                <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] text-white bg-red-600 text-[10px] font-normal rounded-full inline-flex items-center justify-center">
                  {cartCount || 0}
                </span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                className="transition xl:hidden focus:outline-none"
                onClick={() => setNavigationOpen(!navigationOpen)}
                aria-label={navigationOpen ? "Close menu" : "Open menu"}
              >
                {navigationOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu - Offcanvas */}

      <MobileMenu
        headerLogo={headerData?.headerLogo || null}
        isOpen={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        menuData={menuData}
      />
    </>
  );
};

export default MainHeader;
