-- Diecast model scale (e.g. 1:64) for products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "diecast_scale" VARCHAR(10);
