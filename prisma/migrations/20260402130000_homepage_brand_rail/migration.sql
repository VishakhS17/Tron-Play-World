-- CreateTable
CREATE TABLE "homepage_brand_rail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_public_id" VARCHAR(255),
    "label_override" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_brand_rail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_homepage_brand_rail_brand_id" ON "homepage_brand_rail"("brand_id");

-- AddForeignKey
ALTER TABLE "homepage_brand_rail" ADD CONSTRAINT "homepage_brand_rail_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
