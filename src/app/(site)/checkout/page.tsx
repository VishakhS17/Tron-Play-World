"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/utils/formatePrice";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartDetails, totalPrice, clearCart } = useCart();
  const items = useMemo(() => Object.values(cartDetails ?? {}), [cartDetails]);

  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const [address, setAddress] = useState({
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
  });

  async function handlePlaceOrder() {
    if (!items.length) {
      toast.error("Your cart is empty");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: String(i.id), quantity: i.quantity })),
          address,
          couponCode: couponCode.trim() || undefined,
          isGift,
          giftMessage: giftMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Checkout failed");
      clearCart();
      const tokenQuery =
        typeof data?.accessToken === "string" && data.accessToken
          ? `?access=${encodeURIComponent(data.accessToken)}`
          : "";
      router.push(`/payment/${data.orderId}${tokenQuery}`);
    } catch (e: any) {
      toast.error(e?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pt-36 pb-16">
      <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <h1 className="text-2xl font-semibold text-dark mb-8">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,_1fr)_380px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-3 bg-white p-5">
              <h2 className="text-lg font-semibold text-dark">Shipping address</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ["full_name", "Full name"],
                    ["phone", "Phone"],
                    ["line1", "Address line 1"],
                    ["line2", "Address line 2 (optional)"],
                    ["city", "City"],
                    ["state", "State"],
                    ["postal_code", "Postal code"],
                    ["country", "Country"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className={key === "line1" || key === "line2" ? "sm:col-span-2" : ""}>
                    <span className="mb-1 block text-sm font-medium text-dark">{label}</span>
                    <input
                      value={(address as any)[key]}
                      onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                      required={key !== "line2"}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-3 bg-white p-5">
              <h2 className="text-lg font-semibold text-dark">Gift options</h2>
              <label className="mt-3 flex items-center gap-2 text-sm text-meta-3">
                <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
                Mark this order as a gift
              </label>
              {isGift ? (
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                  placeholder="Gift message (optional)"
                  rows={3}
                />
              ) : null}
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-3 bg-white p-5 h-fit">
            <h2 className="text-lg font-semibold text-dark">Order summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-meta-3">Subtotal</span>
                <span className="font-medium text-dark">
                  {totalPrice ? formatPrice(totalPrice) : formatPrice(0)}
                </span>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-dark">Coupon</span>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                  placeholder="Enter coupon code"
                />
              </label>
            </div>

            <button
              disabled={loading}
              onClick={handlePlaceOrder}
              className="mt-6 inline-flex w-full justify-center rounded-lg bg-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-60"
            >
              {loading ? "Placing order…" : "Place order"}
            </button>
            <p className="mt-3 text-xs text-meta-4">
              Payment is a placeholder right now. Next screen will simulate success/failure with server confirmation.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

