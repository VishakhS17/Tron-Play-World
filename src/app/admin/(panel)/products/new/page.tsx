"use client";

import { parseAdminJsonResponse } from "@/lib/admin/parseAdminFetchResponse";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SelectWithCreate from "../../_components/SelectWithCreate";
import ImageGallery, { GalleryImage } from "../../_components/ImageGallery";

/** Match API / Vercel body limit — reject before upload to avoid opaque 413 errors. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

interface Option { id: string; name: string }

const AGE_GROUPS = [
  "0-2 years", "2-4 years", "4-6 years", "6-8 years",
  "8-10 years", "10-12 years", "12+ years", "All ages",
];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    base_price: "",
    discounted_price: "",
    sku: "",
    description: "",
    short_description: "",
    is_active: true,
    age_group: "",
    category_id: "",
    brand_id: "",
    available_quantity: "0",
    low_stock_threshold: "5",
  });

  useEffect(() => {
    const readJsonSafe = async (res: Response) => {
      const text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };

    (async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/brands"),
        ]);
        const [cats, brnds] = await Promise.all([
          readJsonSafe(catRes),
          readJsonSafe(brandRes),
        ]);
        if (!catRes.ok || !brandRes.ok) {
          const msg =
            (cats as { error?: string } | null)?.error ||
            (brnds as { error?: string } | null)?.error ||
            "Failed to load categories/brands";
          throw new Error(msg);
        }
        setCategories(Array.isArray(cats) ? cats : []);
        setBrands(Array.isArray(brnds) ? brnds : []);
      } catch (err: unknown) {
        setCategories([]);
        setBrands([]);
        toast.error(err instanceof Error ? err.message : "Failed to load categories/brands");
      }
    })();
  }, []);

  function autoSlug(name: string) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleAddFiles(files: FileList) {
    const fileArr = Array.from(files);
    // Use stable temp IDs so parallel updates target the right slots
    const tempIds = fileArr.map((_, i) => `temp-${Date.now()}-${i}-${Math.random()}`);

    setImages((prev) => [
      ...prev,
      ...tempIds.map((tid) => ({ id: tid, url: "", uploading: true })),
    ]);

    await Promise.allSettled(
      fileArr.map(async (file, i) => {
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(`${file.name}: max 4 MB per image on production (Vercel limit).`);
          setImages((prev) => prev.filter((img) => img.id !== tempIds[i]));
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
          const parsed = await parseAdminJsonResponse<{ url?: string }>(res);
          if (!parsed.ok) throw new Error(parsed.message);
          const data = parsed.data;
          if (!data.url) throw new Error("Upload failed: no URL returned");
          setImages((prev) =>
            prev.map((img) =>
              img.id === tempIds[i] ? { id: tempIds[i], url: data.url!, uploading: false } : img
            )
          );
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
          setImages((prev) => prev.filter((img) => img.id !== tempIds[i]));
        }
      })
    );
  }

  function handleDeleteImage(_img: GalleryImage, idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (images.some((img: GalleryImage) => img.uploading)) {
      toast.error("Please wait for images to finish uploading");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          base_price: Number(form.base_price),
          discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
          available_quantity: Number(form.available_quantity),
          low_stock_threshold: Number(form.low_stock_threshold),
          category_id: form.category_id || null,
          brand_id: form.brand_id || null,
          age_group: form.age_group || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create product");

      for (const img of images) {
        if (img.url) {
          await fetch(`/api/admin/products/${data.id}/images`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: img.url }),
          });
        }
      }

      toast.success("Product created");
      router.push(`/admin/products/${data.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-dark">New product</h1>

      <form onSubmit={submit} className="space-y-5">

        {/* Basic details */}
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-dark">Product details</h2>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Name <span className="text-red-500">*</span></span>
            <input
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: autoSlug(name) }));
              }}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dark">Base price (₹) <span className="text-red-500">*</span></span>
              <input
                required
                value={form.base_price}
                onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dark">Discounted price (optional)</span>
              <input
                value={form.discounted_price}
                onChange={(e) => setForm((f) => ({ ...f, discounted_price: e.target.value }))}
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">SKU (optional)</span>
            <input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Short description</span>
            <textarea
              value={form.short_description}
              onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={5}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-meta-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active (visible in store)
          </label>
        </section>

        {/* Classification */}
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-dark">Classification</h2>
          <p className="text-xs text-meta-4">Used for filtering products by category, brand and age on the storefront.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SelectWithCreate
              label="Category"
              value={form.category_id}
              onChange={(id) => setForm((f) => ({ ...f, category_id: id }))}
              options={categories}
              onCreated={(opt) => setCategories((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)))}
              createEndpoint="/api/admin/categories"
            />

            <SelectWithCreate
              label="Brand"
              value={form.brand_id}
              onChange={(id) => setForm((f) => ({ ...f, brand_id: id }))}
              options={brands}
              onCreated={(opt) => setBrands((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)))}
              createEndpoint="/api/admin/brands"
            />

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dark">Age group</span>
              <select
                value={form.age_group}
                onChange={(e) => setForm((f) => ({ ...f, age_group: e.target.value }))}
                className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
              >
                <option value="">— None —</option>
                {AGE_GROUPS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
        </section>

        {/* Images */}
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-dark">Product images</h2>
          <ImageGallery
            images={images}
            onReorder={setImages}
            onDelete={handleDeleteImage}
            onAddFiles={handleAddFiles}
            disabled={loading}
          />
        </section>

        {/* Stock */}
        <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-dark">Stock</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dark">Initial quantity</span>
              <input
                value={form.available_quantity}
                onChange={(e) => setForm((f) => ({ ...f, available_quantity: e.target.value }))}
                inputMode="numeric" min={0}
                className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dark">Low stock alert threshold</span>
              <input
                value={form.low_stock_threshold}
                onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
                inputMode="numeric" min={0}
                className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
              />
              <span className="mt-1 block text-xs text-meta-4">Alert triggers when stock ≤ this number</span>
            </label>
          </div>
        </section>

        <button
          disabled={loading}
          className="rounded-lg bg-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create product"}
        </button>
      </form>
    </div>
  );
}
