-- Diecast scales as lookup (like brands); products reference by FK.

CREATE TABLE "diecast_scales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ratio" VARCHAR(10) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diecast_scales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "diecast_scales_ratio_key" ON "diecast_scales"("ratio");
CREATE INDEX "idx_diecast_scales_ratio" ON "diecast_scales"("ratio");

INSERT INTO "diecast_scales" ("ratio", "name") VALUES
('1:64', '1:64'),
('1:43', '1:43'),
('1:32', '1:32'),
('1:24', '1:24'),
('1:18', '1:18');

ALTER TABLE "products" ADD COLUMN "diecast_scale_id" UUID;

INSERT INTO "diecast_scales" ("ratio", "name")
SELECT DISTINCT TRIM("diecast_scale"), TRIM("diecast_scale")
FROM "products"
WHERE "diecast_scale" IS NOT NULL AND TRIM("diecast_scale") <> ''
ON CONFLICT ("ratio") DO NOTHING;

UPDATE "products" p
SET "diecast_scale_id" = d.id
FROM "diecast_scales" d
WHERE p."diecast_scale" IS NOT NULL AND TRIM(p."diecast_scale") = d.ratio;

ALTER TABLE "products" DROP COLUMN "diecast_scale";

ALTER TABLE "products" ADD CONSTRAINT "products_diecast_scale_id_fkey"
  FOREIGN KEY ("diecast_scale_id") REFERENCES "diecast_scales"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_products_diecast_scale_id" ON "products"("diecast_scale_id");
