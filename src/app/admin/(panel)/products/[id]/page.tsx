"use client";

import { parseAdminJsonResponse } from "@/lib/admin/parseAdminFetchResponse";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SelectWithCreate from "../../_components/SelectWithCreate";
import ImageGallery, { GalleryImage } from "../../_components/ImageGallery";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

interface Option { id: string; name: string }

const AGE_GROUPS = [
  "0-2 years", "2-4 years", "4-6 years", "6-8 years",
  "8-10 years", "10-12 years", "12+ years", "All ages",
];

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [imgBusy, setImgBusy] = useState(false);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [diecastScales, setDiecastScales] = useState<Option[]>([]);

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
        const [productRes, catRes, brandRes, scaleRes] = await Promise.all([
          fetch(`/api/admin/products/${id}`),
          fetch("/api/admin/categories"),
          fetch("/api/admin/brands"),
          fetch("/api/admin/diecast-scales"),
        ]);
        const [product, cats, brnds, scales] = await Promise.all([
          readJsonSafe(productRes),
          readJsonSafe(catRes),
          readJsonSafe(brandRes),
          readJsonSafe(scaleRes),
        ]);
        if (!catRes.ok || !brandRes.ok || !scaleRes.ok) {
          const msg =
            (cats as { error?: string } | null)?.error ||
            (brnds as { error?: string } | null)?.error ||
            (scales as { error?: string } | null)?.error ||
            "Failed to load categories/brands/scales";
          throw new Error(msg);
        }

        if (product && typeof product === "object" && !("error" in (product as Record<string, unknown>))) {
          setForm(product);
          setImages((product as { product_images?: GalleryImage[] }).product_images ?? []);
        }
        setCategories(Array.isArray(cats) ? cats : []);
        setBrands(Array.isArray(brnds) ? brnds : []);
        setDiecastScales(Array.isArray(scales) ? scales : []);
      } catch (err: unknown) {
        setCategories([]);
        setBrands([]);
        setDiecastScales([]);
        toast.error(err instanceof Error ? err.message : "Failed to load categories/brands/scales");
      }
    })();
  }, [id]);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          base_price: Number(form.base_price),
          discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
          shipping_per_unit:
            form.shipping_per_unit === "" || form.shipping_per_unit == null
              ? 0
              : Number(form.shipping_per_unit),
          max_order_quantity:
            form.max_order_quantity === "" || form.max_order_quantity == null
              ? 99
              : Number(form.max_order_quantity),
          available_quantity: Number(form.available_quantity),
          low_stock_threshold: Number(form.low_stock_threshold),
          diecast_scale_id: form.diecast_scale_id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      toast.success("Saved");
      router.push("/admin/products");
    } catch (err: any) {
      toast.error(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct() {
    const label = String(form?.name ?? "this product");
    const ok = window.confirm(
      `Delete "${label}"? This will remove the product and its product images. This action cannot be undone.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete product");
      toast.success("Product deleted");
      router.push("/admin/products");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddFiles(files: FileList) {
    const fileArr = Array.from(files);
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
          const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: fd });
          const uploadParsed = await parseAdminJsonResponse<{ url?: string }>(uploadRes);
          if (!uploadParsed.ok) throw new Error(uploadParsed.message);
          const uploadData = uploadParsed.data;
          if (!uploadData.url) throw new Error("Upload failed: no URL returned");

          const imgRes = await fetch(`/api/admin/products/${id}/images`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: uploadData.url }),
          });
          const imgParsed = await parseAdminJsonResponse(imgRes);
          if (!imgParsed.ok) throw new Error(imgParsed.message);
          const imgData = imgParsed.data as GalleryImage;

          // Replace temp placeholder with saved record (which has the real DB id)
          setImages((prev) =>
            prev.map((img) => (img.id === tempIds[i] ? imgData : img))
          );
          toast.success("Image uploaded");
        } catch (err: any) {
          toast.error(err?.message || "Failed");
          setImages((prev) => prev.filter((img) => img.id !== tempIds[i]));
        }
      })
    );
  }

  async function handleDeleteImage(img: GalleryImage) {
    if (!img.id) return;
    try {
      const res = await fetch(
        `/api/admin/products/${id}/images?imageId=${img.id}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setImages((prev) => prev.filter((m) => m.id !== img.id));
      toast.success("Image removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove image");
    }
  }

  async function handleReorder(newOrder: GalleryImage[]) {
    setImages(newOrder);
    // Persist to DB — skip items that still have temp IDs (shouldn't happen, but guard)
    const ids = newOrder.map((img) => img.id).filter((imgId): imgId is string => !!imgId && !imgId.startsWith("temp-"));
    if (ids.length === 0) return;
    setImgBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/images`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: ids }),
      });
      if (!res.ok) throw new Error("Failed to save order");
    } catch {
      toast.error("Could not save image order");
    } finally {
      setImgBusy(false);
    }
  }

  if (!form) {
    return <div className="text-sm text-meta-3">Loading…</div>;
  }

  const isLowStock =
    typeof form.available_quantity === "number" &&
    typeof form.low_stock_threshold === "number" &&
    form.available_quantity <= form.low_stock_threshold;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-dark">Edit product</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={deleteProduct}
            disabled={deleting || loading}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={save}
            disabled={loading || deleting}
            className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Low-stock banner */}
      {isLowStock && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <span className="text-base">⚠️</span>
          <span>
            <b>Low stock:</b> only {form.available_quantity} unit{form.available_quantity !== 1 ? "s" : ""} left (threshold: {form.low_stock_threshold})
          </span>
        </div>
      )}

      {/* Product details */}
      <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-dark">Product details</h2>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">Name <span className="text-red-500">*</span></span>
          <input
            value={form.name ?? ""}
            onChange={(e) => {
              const name = e.target.value;
              const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              setForm((f: any) => ({ ...f, name, slug }));
            }}
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Base price (₹) <span className="text-red-500">*</span></span>
            <input
              value={form.base_price ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, base_price: e.target.value }))}
              inputMode="decimal"
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Discounted price</span>
            <input
              value={form.discounted_price ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, discounted_price: e.target.value }))}
              inputMode="decimal"
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
        </div>

        <label className="block max-w-md">
          <span className="mb-1 block text-sm font-medium text-dark">Shipping per unit (₹)</span>
          <input
            value={form.shipping_per_unit ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, shipping_per_unit: e.target.value }))}
            inputMode="decimal"
            placeholder="0"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <span className="mt-1 block text-xs text-meta-4">
            Order shipping includes quantity × this amount per SKU. Leave 0 to use the default flat fee when below
            free shipping.
          </span>
        </label>
        <label className="block max-w-md">
          <span className="mb-1 block text-sm font-medium text-dark">Max order quantity</span>
          <input
            value={form.max_order_quantity ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, max_order_quantity: e.target.value }))}
            inputMode="numeric"
            placeholder="99"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <span className="mt-1 block text-xs text-meta-4">
            Per-product cap per order. Checkout is blocked if quantity exceeds this limit.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">SKU</span>
          <input
            value={form.sku ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, sku: e.target.value }))}
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">HSN (GST)</span>
          <input
            value={form.hsn_code ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, hsn_code: e.target.value }))}
            placeholder="e.g. 95030010"
            inputMode="numeric"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <span className="mt-1 block text-xs text-meta-4">
            Digits only (comma-separated if multiple codes on this SKU). Used for Shipmozo / invoicing.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">Short description</span>
          <textarea
            value={form.short_description ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, short_description: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">Description</span>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
            rows={5}
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-meta-3">
          <input
            type="checkbox"
            checked={Boolean(form.is_active)}
            onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.checked }))}
          />
          Active (visible in store)
        </label>
      </section>

      {/* Classification */}
      <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-dark">Classification</h2>
        <p className="text-xs text-meta-4">Used for filtering products by category, brand and age on the storefront.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectWithCreate
            label="Category"
            value={form.category_id ?? ""}
            onChange={(val) => setForm((f: any) => ({ ...f, category_id: val }))}
            options={categories}
            onCreated={(opt) => setCategories((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)))}
            createEndpoint="/api/admin/categories"
          />

          <SelectWithCreate
            label="Brand"
            value={form.brand_id ?? ""}
            onChange={(val) => setForm((f: any) => ({ ...f, brand_id: val }))}
            options={brands}
            onCreated={(opt) => setBrands((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)))}
            createEndpoint="/api/admin/brands"
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Age group</span>
            <select
              value={form.age_group ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, age_group: e.target.value }))}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="">— None —</option>
              {AGE_GROUPS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          <SelectWithCreate
            label="Diecast scale"
            value={form.diecast_scale_id ?? ""}
            onChange={(scaleId) => setForm((f: any) => ({ ...f, diecast_scale_id: scaleId }))}
            options={diecastScales}
            onCreated={(opt) =>
              setDiecastScales((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)))
            }
            createEndpoint="/api/admin/diecast-scales"
          />
        </div>
      </section>

      {/* Images */}
      <section className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-dark">Product images</h2>
          {imgBusy && (
            <span className="text-xs text-meta-3">Saving order…</span>
          )}
        </div>
        <ImageGallery
          images={images}
          onReorder={handleReorder}
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
            <span className="mb-1 block text-sm font-medium text-dark">Available quantity</span>
            <input
              value={form.available_quantity ?? 0}
              onChange={(e) => setForm((f: any) => ({ ...f, available_quantity: Number(e.target.value) }))}
              inputMode="numeric"
              min={0}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Low stock alert threshold</span>
            <input
              value={form.low_stock_threshold ?? 5}
              onChange={(e) => setForm((f: any) => ({ ...f, low_stock_threshold: Number(e.target.value) }))}
              inputMode="numeric"
              min={0}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
            <span className="mt-1 block text-xs text-meta-4">Alert triggers when stock ≤ this number</span>
          </label>
        </div>
      </section>

      <button
        onClick={save}
        disabled={loading || deleting}
        className="rounded-lg bg-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
