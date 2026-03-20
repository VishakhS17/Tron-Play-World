"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function AdminCsvPage() {
  const [productsCsv, setProductsCsv] = useState("");
  const [inventoryCsv, setInventoryCsv] = useState("");
  const [loading, setLoading] = useState<"products" | "inventory" | null>(null);

  async function upload(kind: "products" | "inventory") {
    setLoading(kind);
    try {
      const body = kind === "products" ? { csv: productsCsv } : { csv: inventoryCsv };
      const res = await fetch(`/api/admin/csv/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      toast.success(`Imported ${data.count} rows`);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-dark">
        CSV Upload{" "}
        <span className="text-sm font-medium text-meta-3">(Not implemented)</span>
      </h1>

      <div className="rounded-2xl border border-gray-3 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-dark">Products CSV</h2>
        <p className="text-sm text-meta-3">
          Columns: <b className="text-dark">name,slug,base_price,discounted_price,sku,is_active</b>
        </p>
        <textarea
          value={productsCsv}
          onChange={(e) => setProductsCsv(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue font-mono"
          placeholder={`name,slug,base_price,discounted_price,sku,is_active\nToy Car,toy-car,199,149,SKU-1,true`}
        />
        <button
          disabled
          onClick={() => {}}
          className="rounded-lg bg-gray-3 px-5 py-2.5 text-sm font-medium text-meta-4 cursor-not-allowed"
        >
          Import products
        </button>
      </div>

      <div className="rounded-2xl border border-gray-3 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-dark">Inventory CSV</h2>
        <p className="text-sm text-meta-3">
          Columns: <b className="text-dark">product_slug,available_quantity,low_stock_threshold</b>
        </p>
        <textarea
          value={inventoryCsv}
          onChange={(e) => setInventoryCsv(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue font-mono"
          placeholder={`product_slug,available_quantity,low_stock_threshold\ntoy-car,50,5`}
        />
        <button
          disabled
          onClick={() => {}}
          className="rounded-lg bg-gray-3 px-5 py-2.5 text-sm font-medium text-meta-4 cursor-not-allowed"
        >
          Import inventory
        </button>
      </div>
    </div>
  );
}

