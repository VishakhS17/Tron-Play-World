"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function EditCouponPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/coupons/${id}`);
      const data = await res.json().catch(() => null);
      setForm(data);
    })();
  }, [id]);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast.success("Saved");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!form) return <div className="text-sm text-meta-3">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-dark">Edit coupon</h1>
        <button
          disabled={loading}
          onClick={save}
          className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">Code</span>
          <input
            value={form.code ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))}
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Type</span>
            <select
              value={form.discount_type}
              onChange={(e) => setForm((f: any) => ({ ...f, discount_type: e.target.value }))}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="PERCENTAGE">PERCENTAGE</option>
              <option value="FIXED">FIXED</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark">Value</span>
            <input
              value={form.discount_value ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, discount_value: e.target.value }))}
              className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">Min cart value</span>
          <input
            value={form.min_cart_value ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, min_cart_value: e.target.value }))}
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-meta-3">
          <input
            type="checkbox"
            checked={Boolean(form.is_active)}
            onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.checked }))}
          />
          Active
        </label>
      </div>
    </div>
  );
}

