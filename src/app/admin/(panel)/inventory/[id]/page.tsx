"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function InventoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/inventory/${id}`);
      const data = await res.json().catch(() => null);
      setRow(data);
    })();
  }, [id]);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(row),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      toast.success("Inventory updated");
      router.push("/admin/inventory");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!row) return <div className="text-sm text-meta-3">Loading…</div>;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-dark">Edit inventory</h1>
      <div className="rounded-2xl border border-gray-3 bg-white p-6 space-y-4">
        <div className="text-sm text-meta-3">
          Product: <b className="text-dark">{row.productName ?? "—"}</b>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">Available quantity</span>
          <input
            value={row.available_quantity ?? 0}
            onChange={(e) => setRow((r: any) => ({ ...r, available_quantity: Number(e.target.value) }))}
            inputMode="numeric"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dark">Low stock threshold</span>
          <input
            value={row.low_stock_threshold ?? 0}
            onChange={(e) => setRow((r: any) => ({ ...r, low_stock_threshold: Number(e.target.value) }))}
            inputMode="numeric"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <button
          disabled={loading}
          onClick={save}
          className="rounded-lg bg-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

