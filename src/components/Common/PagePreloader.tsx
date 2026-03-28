"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INITIAL_MS = 480;
const NAV_MS = 360;

/** Default logo path matches MainHeader / MobileMenu fallback */
const DEFAULT_LOGO = "/images/logo/ChatGPT Image Mar 3, 2026, 09_30_51 PM.png";

/**
 * Solid white screen with logo and red progress bar on route load / navigation.
 */
export default function PagePreloader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [barKey, setBarKey] = useState(0);
  const [barDurationMs, setBarDurationMs] = useState(INITIAL_MS);
  const isFirstPathEffect = useRef(true);

  useEffect(() => {
    if (isFirstPathEffect.current) {
      isFirstPathEffect.current = false;
      setBarDurationMs(INITIAL_MS);
      const t = window.setTimeout(() => setVisible(false), INITIAL_MS);
      return () => window.clearTimeout(t);
    }

    setBarDurationMs(NAV_MS);
    setBarKey((k) => k + 1);
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), NAV_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[10050] flex flex-col items-center justify-center bg-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex w-full max-w-[min(280px,85vw)] flex-col items-center gap-5 px-6">
        <Image
          src={DEFAULT_LOGO}
          alt="i-Robox"
          width={160}
          height={64}
          priority
          className="h-auto w-[min(160px,55vw)] object-contain"
        />
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-3">
          <div
            key={barKey}
            className="tpw-preloader-bar-fill h-full rounded-full bg-[#c41e3a]"
            style={{
              width: "0%",
              animationDuration: `${barDurationMs}ms`,
            }}
          />
        </div>
      </div>
      <span className="sr-only">Page is loading</span>
    </div>
  );
}
