"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Initial = {
  slides: unknown[];
  highlights: unknown[];
  announcements: unknown[];
  popups: unknown[];
  flashSales: unknown[];
  settings: { first_visit_coupon_code: string | null } | null;
  categories: { id: string; name: string; slug: string }[];
  products: {
    id: string;
    name: string;
    slug: string;
    base_price: number | string;
    discounted_price: number | string | null;
  }[];
  brands: { id: string; name: string; slug: string }[];
  coupons: {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    is_active: boolean;
  }[];
};

async function j<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export default function MarketingAdminClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "hero" | "highlights" | "announcements" | "popups" | "flash" | "settings"
  >("hero");
  const [slides, setSlides] = useState(initial.slides);
  const [highlights, setHighlights] = useState(initial.highlights);
  const [announcements, setAnnouncements] = useState(initial.announcements);
  const [popups, setPopups] = useState(initial.popups);
  const [flashSales, setFlashSales] = useState(initial.flashSales);
  const [firstVisit, setFirstVisit] = useState(initial.settings?.first_visit_coupon_code ?? "");
  const [heroUploading, setHeroUploading] = useState(false);
  const [highlightUploading, setHighlightUploading] = useState(false);
  const [popupUploading, setPopupUploading] = useState(false);
  const [flashSaving, setFlashSaving] = useState(false);
  const [flashEditingId, setFlashEditingId] = useState<string | null>(null);
  const [flashEditPrice, setFlashEditPrice] = useState<string>("");
  const [flashEditActive, setFlashEditActive] = useState<boolean>(true);

  const cats = initial.categories;
  const prods = initial.products;
  const brands = initial.brands;
  const coupons = initial.coupons;

  const productOptions = useMemo(
    () =>
      prods.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} (listed: ₹{Number(p.discounted_price ?? p.base_price)})
        </option>
      )),
    [prods]
  );
  const categoryOptions = useMemo(
    () =>
      cats.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      )),
    [cats]
  );
  const brandOptions = useMemo(
    () =>
      brands.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      )),
    [brands]
  );
  const couponOptions = useMemo(
    () =>
      coupons
        .filter((c) => c.is_active)
        .map((c) => (
          <option key={c.id} value={c.code}>
            {c.code} ({c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : `₹${c.discount_value}`})
          </option>
        )),
    [coupons]
  );

  async function refreshHero() {
    const r = await fetch("/api/admin/marketing/hero-slides", { cache: "no-store" });
    setSlides(await r.json());
  }
  async function refreshHighlights() {
    const r = await fetch("/api/admin/marketing/highlights", { cache: "no-store" });
    setHighlights(await r.json());
  }
  async function refreshAnnouncements() {
    const r = await fetch("/api/admin/marketing/announcements", { cache: "no-store" });
    setAnnouncements(await r.json());
  }
  async function refreshPopups() {
    const r = await fetch("/api/admin/marketing/popups", { cache: "no-store" });
    setPopups(await r.json());
  }
  async function refreshFlash() {
    const r = await fetch(`/api/admin/marketing/flash-sales?t=${Date.now()}`, { cache: "no-store" });
    setFlashSales(await r.json());
  }

  function listedPriceForProduct(productId: string): number | null {
    const p = prods.find((x) => x.id === productId);
    if (!p) return null;
    return Number(p.discounted_price ?? p.base_price);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-dark">Marketing</h1>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["hero", "Hero"],
            ["highlights", "Highlights"],
            ["announcements", "Announcements"],
            ["popups", "Popups"],
            ["flash", "Flash sales"],
            ["settings", "First visit"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${
              tab === k
                ? "border-blue bg-blue text-white"
                : "border-gray-3 bg-white text-dark hover:bg-gray-1"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "hero" ? (
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Hero slides</h2>
          <ul className="divide-y divide-gray-3 text-sm">
            {slides.map((row: any) => (
              <li key={row.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-meta-3 font-mono text-xs">{row.id}</span>
                <span className="flex-1 truncate">{row.image_url}</span>
                <button
                  type="button"
                  className="text-red-600 text-sm"
                  onClick={async () => {
                    if (!confirm("Delete slide?")) return;
                    await j(
                      await fetch(`/api/admin/marketing/hero-slides/${row.id}`, { method: "DELETE" })
                    );
                    toast.success("Deleted");
                    void refreshHero();
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              try {
                let imageUrl = String(fd.get("image_url") ?? "").trim();
                let imagePublicId: string | null = null;
                const heroFile = fd.get("image_file");
                if (heroFile instanceof File && heroFile.size > 0) {
                  setHeroUploading(true);
                  const uploadFd = new FormData();
                  uploadFd.append("file", heroFile);
                  const uploadRes = await j<{ url: string; public_id: string }>(
                    await fetch("/api/admin/marketing/hero-slides/upload", {
                      method: "POST",
                      body: uploadFd,
                    })
                  );
                  imageUrl = uploadRes.url;
                  imagePublicId = uploadRes.public_id;
                }
                if (!imageUrl) throw new Error("Provide an image URL or upload a banner image");

                await j(
                  await fetch("/api/admin/marketing/hero-slides", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      image_url: imageUrl,
                      image_public_id: imagePublicId,
                      title: fd.get("title") || null,
                      link_url: fd.get("link_url") || null,
                      sort_order: Number(fd.get("sort_order") || 0),
                      is_active: fd.get("is_active") === "on",
                    }),
                  })
                );
                toast.success("Created");
                e.currentTarget.reset();
                void refreshHero();
              } catch (err: any) {
                toast.error(err?.message || "Failed");
              } finally {
                setHeroUploading(false);
              }
            }}
          >
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Image URL (optional if uploading)</span>
              <input name="image_url" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Upload Banner (Cloudinary)</span>
              <input
                name="image_file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-meta-3">If both are provided, uploaded file is used.</p>
            </label>
            <label>
              <span className="text-sm font-medium">Title</span>
              <input name="title" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Link URL</span>
              <input name="link_url" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Sort</span>
              <input name="sort_order" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input name="is_active" type="checkbox" defaultChecked /> Active
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={heroUploading}
                className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {heroUploading ? "Uploading..." : "Add slide"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "highlights" ? (
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Homepage highlights</h2>
          <ul className="divide-y divide-gray-3 text-sm">
            {highlights.map((row: any) => (
              <li key={row.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <span>
                  {row.kind} — {row.title}
                </span>
                <button
                  type="button"
                  className="text-red-600 text-sm"
                  onClick={async () => {
                    if (!confirm("Delete?")) return;
                    await j(await fetch(`/api/admin/marketing/highlights/${row.id}`, { method: "DELETE" }));
                    toast.success("Deleted");
                    void refreshHighlights();
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const kind = String(fd.get("kind"));
              try {
                let imageUrl = String(fd.get("image_url") ?? "").trim();
                let imagePublicId: string | null = null;
                const hiFile = fd.get("image_file");
                if (hiFile instanceof File && hiFile.size > 0) {
                  setHighlightUploading(true);
                  const uploadFd = new FormData();
                  uploadFd.append("file", hiFile);
                  const uploadRes = await j<{ url: string; public_id: string }>(
                    await fetch("/api/admin/marketing/highlights/upload", {
                      method: "POST",
                      body: uploadFd,
                    })
                  );
                  imageUrl = uploadRes.url;
                  imagePublicId = uploadRes.public_id;
                }
                await j(
                  await fetch("/api/admin/marketing/highlights", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      kind,
                      category_id: kind === "CATEGORY" ? fd.get("category_id") : null,
                      product_id: kind === "PRODUCT" ? fd.get("product_id") : null,
                      brand_id: kind === "BRAND" ? fd.get("brand_id") : null,
                      title: fd.get("title"),
                      subtitle: fd.get("subtitle") || null,
                      image_url: imageUrl || null,
                      image_public_id: imagePublicId,
                      link_url: fd.get("link_url") || null,
                      sort_order: Number(fd.get("sort_order") || 0),
                      is_active: fd.get("is_active") === "on",
                    }),
                  })
                );
                toast.success("Created");
                e.currentTarget.reset();
                void refreshHighlights();
              } catch (err: any) {
                toast.error(err?.message || "Failed");
              } finally {
                setHighlightUploading(false);
              }
            }}
          >
            <label>
              <span className="text-sm font-medium">Kind</span>
              <select name="kind" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="FEATURED">FEATURED</option>
                <option value="TRENDING">TRENDING</option>
                <option value="CATEGORY">CATEGORY</option>
                <option value="PRODUCT">PRODUCT</option>
                <option value="BRAND">BRAND</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Category (for CATEGORY)</span>
              <select name="category_id" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="">—</option>
                {categoryOptions}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Product (for PRODUCT)</span>
              <select name="product_id" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="">—</option>
                {productOptions}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Brand (for BRAND)</span>
              <select name="brand_id" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="">—</option>
                {brandOptions}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Title</span>
              <input name="title" required className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Subtitle</span>
              <input name="subtitle" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Image URL (optional if uploading)</span>
              <input name="image_url" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Upload Image (Cloudinary)</span>
              <input
                name="image_file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-meta-3">If both are provided, uploaded file is used.</p>
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Link override</span>
              <input name="link_url" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Sort</span>
              <input name="sort_order" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input name="is_active" type="checkbox" defaultChecked /> Active
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={highlightUploading}
                className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {highlightUploading ? "Uploading..." : "Add highlight"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "announcements" ? (
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Announcement bar</h2>
          <p className="text-sm text-meta-3">
            UTILITY = top gray strip (left of welcome). MARQUEE = scrolling row below.
          </p>
          <ul className="divide-y divide-gray-3 text-sm">
            {announcements.map((row: any) => (
              <li key={row.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <span>
                  {row.placement}: {row.body}
                </span>
                <button
                  type="button"
                  className="text-red-600 text-sm"
                  onClick={async () => {
                    if (!confirm("Delete?")) return;
                    await j(
                      await fetch(`/api/admin/marketing/announcements/${row.id}`, { method: "DELETE" })
                    );
                    toast.success("Deleted");
                    void refreshAnnouncements();
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              try {
                await j(
                  await fetch("/api/admin/marketing/announcements", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      placement: fd.get("placement"),
                      body: fd.get("body"),
                      link_url: fd.get("link_url") || null,
                      link_label: fd.get("link_label") || null,
                      sort_order: Number(fd.get("sort_order") || 0),
                      is_active: fd.get("is_active") === "on",
                    }),
                  })
                );
                toast.success("Created");
                e.currentTarget.reset();
                void refreshAnnouncements();
              } catch (err: any) {
                toast.error(err?.message || "Failed");
              }
            }}
          >
            <label>
              <span className="text-sm font-medium">Placement</span>
              <select name="placement" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="UTILITY">UTILITY</option>
                <option value="MARQUEE">MARQUEE</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Sort</span>
              <input name="sort_order" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Body</span>
              <textarea name="body" required rows={2} className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Link URL</span>
              <input name="link_url" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Link label</span>
              <input name="link_label" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input name="is_active" type="checkbox" defaultChecked /> Active
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white">
                Add
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "popups" ? (
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Popup campaigns</h2>
          <ul className="divide-y divide-gray-3 text-sm">
            {popups.map((row: any) => (
              <li key={row.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <span>{row.title}</span>
                <button
                  type="button"
                  className="text-red-600 text-sm"
                  onClick={async () => {
                    if (!confirm("Delete?")) return;
                    await j(await fetch(`/api/admin/marketing/popups/${row.id}`, { method: "DELETE" }));
                    toast.success("Deleted");
                    void refreshPopups();
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              try {
                let imageUrl = String(fd.get("image_url") ?? "").trim();
                const popupFile = fd.get("image_file");
                if (popupFile instanceof File && popupFile.size > 0) {
                  setPopupUploading(true);
                  const uploadFd = new FormData();
                  uploadFd.append("file", popupFile);
                  const uploadRes = await j<{ url: string }>(
                    await fetch("/api/admin/marketing/popups/upload", {
                      method: "POST",
                      body: uploadFd,
                    })
                  );
                  imageUrl = uploadRes.url;
                }
                await j(
                  await fetch("/api/admin/marketing/popups", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      title: fd.get("title"),
                      body: fd.get("body"),
                      image_url: imageUrl || null,
                      cta_label: fd.get("cta_label") || null,
                      cta_url: fd.get("cta_url") || null,
                      delay_ms: Number(fd.get("delay_ms") || 0),
                      frequency: fd.get("frequency"),
                      audience: fd.get("audience"),
                      suggested_coupon_code: fd.get("suggested_coupon_code") || null,
                      sort_priority: Number(fd.get("sort_priority") || 0),
                      is_active: fd.get("is_active") === "on",
                    }),
                  })
                );
                toast.success("Created");
                e.currentTarget.reset();
                void refreshPopups();
              } catch (err: any) {
                toast.error(err?.message || "Failed");
              } finally {
                setPopupUploading(false);
              }
            }}
          >
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Title</span>
              <input name="title" required className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Body</span>
              <textarea name="body" required rows={3} className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Image URL (optional if uploading)</span>
              <input name="image_url" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Upload Image (Cloudinary)</span>
              <input
                name="image_file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-meta-3">If both are provided, uploaded file is used.</p>
            </label>
            <label>
              <span className="text-sm font-medium">CTA label</span>
              <input name="cta_label" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">CTA URL</span>
              <input name="cta_url" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Delay (ms)</span>
              <input name="delay_ms" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Sort priority</span>
              <input name="sort_priority" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-sm font-medium">Frequency</span>
              <select name="frequency" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="ONCE_PER_SESSION">ONCE_PER_SESSION</option>
                <option value="ONCE_PER_DEVICE">ONCE_PER_DEVICE</option>
                <option value="EVERY_VISIT">EVERY_VISIT</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Audience</span>
              <select name="audience" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="ALL">ALL</option>
                <option value="GUESTS_ONLY">GUESTS_ONLY</option>
                <option value="LOGGED_IN_ONLY">LOGGED_IN_ONLY</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Suggested coupon code</span>
              <input name="suggested_coupon_code" className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input name="is_active" type="checkbox" defaultChecked /> Active
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={popupUploading}
                className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {popupUploading ? "Uploading..." : "Add popup"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "flash" ? (
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Flash sale prices</h2>
          <p className="text-sm text-meta-3">
            Overrides catalog unit price at checkout when active (and in window).
          </p>
          <ul className="divide-y divide-gray-3 text-sm">
            {flashSales.map((row: any) => (
              <li key={row.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                {flashEditingId === row.id ? (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="min-w-[180px] font-medium text-dark">
                      {row.products?.name ?? row.product_id}
                    </span>
                    <input
                      value={flashEditPrice}
                      onChange={(e) => setFlashEditPrice(e.target.value)}
                      type="number"
                      step="0.01"
                      className="w-32 rounded-lg border border-gray-3 px-3 py-1.5 text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={flashEditActive}
                        onChange={(e) => setFlashEditActive(e.target.checked)}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="rounded bg-blue px-3 py-1.5 text-xs font-medium text-white"
                      onClick={async () => {
                        const entered = Number(flashEditPrice);
                        const listed = listedPriceForProduct(row.product_id);
                        if (!Number.isFinite(entered) || entered <= 0) {
                          toast.error("Enter valid sale price");
                          return;
                        }
                        if (listed != null && !(entered < listed)) {
                          toast.error(`Flash sale must be lower than listed price ₹${listed}`);
                          return;
                        }
                        await j(
                          await fetch(`/api/admin/marketing/flash-sales/${row.id}`, {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ sale_price: entered, is_active: flashEditActive }),
                          })
                        );
                        setFlashSales((prev: any[]) =>
                          prev.map((x) =>
                            x.id === row.id ? { ...x, sale_price: entered, is_active: flashEditActive } : x
                          )
                        );
                        setFlashEditingId(null);
                        toast.success("Flash sale updated");
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-3 px-3 py-1.5 text-xs"
                      onClick={() => setFlashEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span>
                      {row.products?.name ?? row.product_id} — ₹{row.sale_price}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-blue text-sm"
                        onClick={() => {
                          setFlashEditingId(row.id);
                          setFlashEditPrice(String(row.sale_price));
                          setFlashEditActive(Boolean(row.is_active));
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-600 text-sm"
                        onClick={async () => {
                          if (!confirm("Delete?")) return;
                          await j(
                            await fetch(`/api/admin/marketing/flash-sales/${row.id}`, { method: "DELETE" })
                          );
                          toast.success("Deleted");
                          void refreshFlash();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const fd = new FormData(formEl);
              setFlashSaving(true);
              try {
                const selectedProductId = String(fd.get("product_id") ?? "");
                const selectedProduct = prods.find((p) => p.id === selectedProductId);
                const listedPrice = selectedProduct
                  ? Number(selectedProduct.discounted_price ?? selectedProduct.base_price)
                  : null;
                const enteredPrice = Number(fd.get("sale_price"));
                if (listedPrice != null && !(enteredPrice < listedPrice)) {
                  toast.error(`Flash sale must be lower than listed price ₹${listedPrice}`);
                  return;
                }

                const saved = await j<{ item?: any }>(
                  await fetch("/api/admin/marketing/flash-sales", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      product_id: selectedProductId,
                      sale_price: enteredPrice,
                      is_active: fd.get("is_active") === "on",
                    }),
                  })
                );
                toast.success("Flash sale saved (created or updated)");
                formEl.reset();
                if (saved?.item) {
                  setFlashSales((prev: any[]) => {
                    const exists = prev.some((x) => x.id === saved.item.id);
                    const next = exists
                      ? prev.map((x) => (x.id === saved.item.id ? saved.item : x))
                      : [saved.item, ...prev];
                    return next;
                  });
                }
                await refreshFlash();
                router.refresh();
              } catch (err: any) {
                toast.error(err?.message || "Failed");
              } finally {
                setFlashSaving(false);
              }
            }}
          >
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Product</span>
              <select name="product_id" required className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm">
                <option value="">Select…</option>
                {productOptions}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Sale price (INR)</span>
              <input name="sale_price" type="number" step="0.01" required className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input name="is_active" type="checkbox" defaultChecked /> Active
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={flashSaving}
                className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {flashSaving ? "Saving..." : "Add flash sale"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-semibold">First-visit coupon</h2>
          <p className="text-sm text-meta-3">
            Choose from existing active coupons. Offer is enforced one-time per customer email.
          </p>
          <label className="block">
            <span className="text-sm font-medium">Coupon</span>
            <select
              value={firstVisit}
              onChange={(e) => setFirstVisit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm"
            >
              <option value="">No first-visit coupon</option>
              {couponOptions}
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white"
            onClick={async () => {
              try {
                await j(
                  await fetch("/api/admin/marketing/settings", {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      first_visit_coupon_code: firstVisit.trim() || null,
                    }),
                  })
                );
                toast.success("Saved");
              } catch (err: any) {
                toast.error(err?.message || "Failed");
              }
            }}
          >
            Save
          </button>
        </section>
      ) : null}
    </div>
  );
}
