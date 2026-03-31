ALTER TYPE "homepage_highlight_kind" ADD VALUE IF NOT EXISTS 'BRAND';

ALTER TABLE "homepage_highlights"
ADD COLUMN "brand_id" UUID,
ADD COLUMN "image_public_id" VARCHAR(255);

CREATE INDEX "idx_homepage_highlights_brand_id" ON "homepage_highlights"("brand_id");

ALTER TABLE "homepage_highlights"
ADD CONSTRAINT "homepage_highlights_brand_id_fkey"
FOREIGN KEY ("brand_id") REFERENCES "brands"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
