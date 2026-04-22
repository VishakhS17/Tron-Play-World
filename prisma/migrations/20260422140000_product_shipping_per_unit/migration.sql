-- Per-unit shipping (INR). Checkout sums qty * shipping_per_unit; if sum is 0 and subtotal < free threshold, uses default flat fee.
ALTER TABLE "products" ADD COLUMN "shipping_per_unit" DECIMAL(10,2) NOT NULL DEFAULT 0;
