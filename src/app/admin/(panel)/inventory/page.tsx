import { prisma } from "@/lib/prismaDB";
import Link from "next/link";

export const metadata = {
  title: "Admin Inventory | i-Robox",
};

export default async function AdminInventoryPage() {
  const rows = await prisma.inventory.findMany({
    orderBy: { updated_at: "desc" },
    take: 200,
    select: {
      id: true,
      product_id: true,
      product_variant_id: true,
      available_quantity: true,
      reserved_quantity: true,
      sold_quantity: true,
      low_stock_threshold: true,
      products: { select: { name: true, sku: true } },
    },
  });

  const lowStock = rows.filter((r) => r.available_quantity <= r.low_stock_threshold);
  const outOfStock = rows.filter((r) => r.available_quantity === 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-dark">Inventory</h1>

      {/* Alert banners */}
      {outOfStock.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
          <p className="font-semibold">🚫 {outOfStock.length} product{outOfStock.length !== 1 ? "s" : ""} out of stock</p>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {outOfStock.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/inventory/${r.id}`} className="underline hover:no-underline">
                  {r.products?.name ?? "Unknown"}
                  {r.products?.sku ? ` (${r.products.sku})` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lowStock.length > 0 && outOfStock.length < lowStock.length && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 space-y-1">
          <p className="font-semibold">
            ⚠️ {lowStock.length} product{lowStock.length !== 1 ? "s" : ""} low on stock
          </p>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {lowStock.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/inventory/${r.id}`} className="underline hover:no-underline">
                  {r.products?.name ?? "Unknown"}
                  {r.products?.sku ? ` (${r.products.sku})` : ""}
                </Link>
                {" "}— {r.available_quantity} left (threshold: {r.low_stock_threshold})
              </li>
            ))}
          </ul>
        </div>
      )}

      {lowStock.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ All products have sufficient stock.
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-3 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-meta-3 border-b border-gray-3">
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Available</th>
              <th className="py-3 px-4">Reserved</th>
              <th className="py-3 px-4">Sold</th>
              <th className="py-3 px-4">Threshold</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOut = r.available_quantity === 0;
              const isLow = !isOut && r.available_quantity <= r.low_stock_threshold;
              return (
                <tr key={r.id} className={`border-b border-gray-3 ${isOut ? "bg-red-50" : isLow ? "bg-orange-50" : ""}`}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-dark">{r.products?.name ?? "—"}</div>
                    <div className="text-xs text-meta-4">{r.products?.sku ?? ""}</div>
                  </td>
                  <td className={`py-3 px-4 font-semibold ${isOut ? "text-red-600" : isLow ? "text-orange-600" : "text-dark"}`}>
                    {r.available_quantity}
                  </td>
                  <td className="py-3 px-4 text-dark">{r.reserved_quantity}</td>
                  <td className="py-3 px-4 text-dark">{r.sold_quantity}</td>
                  <td className="py-3 px-4 text-dark">{r.low_stock_threshold}</td>
                  <td className="py-3 px-4">
                    {isOut ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Out of stock</span>
                    ) : isLow ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Low stock</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">OK</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Link className="text-sm font-medium text-blue hover:underline" href={`/admin/inventory/${r.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="py-6 px-4 text-sm text-meta-3" colSpan={7}>
                  No inventory rows found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
