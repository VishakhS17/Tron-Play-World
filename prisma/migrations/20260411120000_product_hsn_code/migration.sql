-- Optional per-product HSN for Delhivery / GST flows
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hsn_code" VARCHAR(32);
