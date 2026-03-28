"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
import toast from "react-hot-toast";

type IProps = {
  headerData?: HeaderSetting | null;
};

type MeResponse = {
  user: {
    id: string;
    email: string | null;
    phone?: string | null;
    name?: string | null;
    roles: string[];
  } | null;
};

const MainHeader = ({ headerData }: IProps) => {
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [stickyMenu, setStickyMenu] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { handleCartClick, cartCount } = useCart();
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
      setIsDesktop(window.innerWidth >= 1280);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const close = () => setAccountOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  async function loadMe(signal?: AbortSignal) {
    const res = await fetch("/api/auth/me", { cache: "no-store", signal });
    const data = (await res.json().catch(() => null)) as MeResponse | null;
    const rawName = data?.user?.name?.trim();
    const fromEmail = data?.user?.email?.split("@")[0]?.trim();
    const fromPhone = data?.user?.phone?.trim();
    setUserName(rawName || fromEmail || fromPhone || null);
  }

  // Read current customer session for greeting text.
  // Re-check on route changes and auth-change events (login/logout/verify).
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        await loadMe(controller.signal);
      } catch {
        setUserName(null);
      }
    };
    run();

    const handleAuthChange = () => {
      void run();
    };
    window.addEventListener("irobox-auth-changed", handleAuthChange);

    return () => {
      controller.abort();
      window.removeEventListener("irobox-auth-changed", handleAuthChange);
    };
  }, [pathname]);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to log out");
      setUserName(null);
      setAccountOpen(false);
      window.dispatchEvent(new Event("irobox-auth-changed"));
      toast.success("Signed out");
    } catch (err: any) {
      toast.error(err?.message || "Could not log out");
    }
  }

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
                <span className="text-xs sm:text-sm font-medium text-blue">
                  Welcome, {userName}!
                </span>
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
                    "/images/logo/site-logo.png"
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
              <DesktopMenu
                menuData={
                  pathname !== "/"
                    ? [{ title: "Home", path: "/" }, ...menuData]
                    : menuData
                }
              />
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

              <div
                className="relative"
                onMouseEnter={() => {
                  if (isDesktop) setAccountOpen(true);
                }}
                onMouseLeave={() => {
                  if (isDesktop) setAccountOpen(false);
                }}
              >
                <button
                  className="transition hover:text-blue focus:outline-none"
                  aria-label="Account"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDesktop) {
                      setAccountOpen((prev) => !prev);
                    } else if (!userName) {
                      window.location.href = "/login";
                    }
                  }}
                >
                  <UserIcon />
                </button>
                <div
                  className={`absolute right-0 top-full w-40 rounded-lg border border-gray-3 bg-white p-2 shadow-lg transition ${
                    accountOpen ? "visible opacity-100" : "invisible opacity-0"
                  }`}
                >
                  <Link
                    href={userName ? "/account" : "/login"}
                    onClick={() => setAccountOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-dark hover:bg-gray-1 hover:text-blue"
                  >
                    Account
                  </Link>
                  {userName ? (
                    <button
                      onClick={handleLogout}
                      className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-dark hover:bg-gray-1 hover:text-blue"
                    >
                      Log out
                    </button>
                  ) : null}
                </div>
              </div>

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
        menuData={
          pathname !== "/"
            ? [{ title: "Home", path: "/" }, ...menuData]
            : menuData
        }
      />
    </>
  );
};

export default MainHeader;
