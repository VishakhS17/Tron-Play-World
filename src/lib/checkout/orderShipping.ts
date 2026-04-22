/** Cart subtotal before discount — free shipping when at or above this. */
export const FREE_SHIPPING_SUBTOTAL_MIN_INR = 2000;

/** Used when no product sets `shipping_per_unit` and subtotal is below the free threshold. */
export const DEFAULT_SHIPPING_FALLBACK_INR = 99;

export function orderShippingInrFromLines(args: {
  /** Pre-discount subtotal (same rule as existing checkout). */
  subtotalBeforeDiscount: number;
  lines: { quantity: number; shippingPerUnit: number }[];
}): number {
  if (args.subtotalBeforeDiscount >= FREE_SHIPPING_SUBTOTAL_MIN_INR) return 0;
  const raw = args.lines.reduce((s, li) => s + li.quantity * Math.max(0, li.shippingPerUnit), 0);
  const rounded = Math.round(raw * 100) / 100;
  if (rounded > 0) return rounded;
  return DEFAULT_SHIPPING_FALLBACK_INR;
}
