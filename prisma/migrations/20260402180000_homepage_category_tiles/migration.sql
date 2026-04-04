-- CreateTable
CREATE TABLE "homepage_category_tiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_public_id" VARCHAR(255),
    "label_override" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_category_tiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homepage_category_tiles_category_id_key" ON "homepage_category_tiles"("category_id");

CREATE INDEX "idx_homepage_category_tiles_category_id" ON "homepage_category_tiles"("category_id");

-- AddForeignKey
ALTER TABLE "homepage_category_tiles" ADD CONSTRAINT "homepage_category_tiles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
