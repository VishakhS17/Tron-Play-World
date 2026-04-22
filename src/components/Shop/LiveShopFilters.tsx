"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  formId: string;
};

export default function LiveShopFilters({ formId }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    let debounceTimer: number | null = null;

    const pushFromForm = (delayMs: number) => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        const fd = new FormData(form);
        const usp = new URLSearchParams();
        for (const [k, v] of fd.entries()) {
          const value = String(v ?? "").trim();
          if (!value) continue;
          if (k === "page") continue;
          usp.append(k, value);
        }
        const q = usp.toString();
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      }, delayMs);
    };

    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t) return;
      const isTextLike =
        t.tagName === "TEXTAREA" ||
        (t.tagName === "INPUT" && (t.type === "text" || t.type === "search" || t.type === "number"));
      pushFromForm(isTextLike ? 250 : 80);
    };

    const onChange = () => pushFromForm(80);
    const onSubmit = (e: Event) => {
      e.preventDefault();
      pushFromForm(0);
    };

    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    form.addEventListener("submit", onSubmit);

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange);
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId, pathname, router]);

  return null;
}

