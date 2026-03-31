-- Marketing CMS, flash sales, coupon category scope, site settings

CREATE TYPE "homepage_highlight_kind" AS ENUM ('FEATURED', 'TRENDING', 'CATEGORY', 'PRODUCT', 'CUSTOM');

CREATE TYPE "announcement_placement" AS ENUM ('UTILITY', 'MARQUEE');

CREATE TYPE "marketing_popup_frequency" AS ENUM ('ONCE_PER_SESSION', 'ONCE_PER_DEVICE', 'EVERY_VISIT');

CREATE TYPE "marketing_popup_audience" AS ENUM ('ALL', 'GUESTS_ONLY', 'LOGGED_IN_ONLY');

CREATE TABLE "homepage_hero_slides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "image_url" TEXT NOT NULL,
    "title" VARCHAR(255),
    "link_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_hero_slides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "homepage_highlights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "homepage_highlight_kind" NOT NULL,
    "category_id" UUID,
    "product_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "subtitle" TEXT,
    "image_url" TEXT,
    "link_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_highlights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_homepage_highlights_category_id" ON "homepage_highlights"("category_id");

CREATE INDEX "idx_homepage_highlights_product_id" ON "homepage_highlights"("product_id");

ALTER TABLE "homepage_highlights" ADD CONSTRAINT "homepage_highlights_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "homepage_highlights" ADD CONSTRAINT "homepage_highlights_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "announcement_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "placement" "announcement_placement" NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "link_label" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_announcement_placement_sort" ON "announcement_entries"("placement", "sort_order");

CREATE TABLE "marketing_popups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "cta_label" VARCHAR(120),
    "cta_url" TEXT,
    "delay_ms" INTEGER NOT NULL DEFAULT 0,
    "frequency" "marketing_popup_frequency" NOT NULL DEFAULT 'ONCE_PER_SESSION',
    "audience" "marketing_popup_audience" NOT NULL DEFAULT 'ALL',
    "suggested_coupon_code" VARCHAR(80),
    "sort_priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_popups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_marketing_popups_active_priority" ON "marketing_popups"("is_active", "sort_priority");

CREATE TABLE "flash_sale_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flash_sale_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "flash_sale_products_product_id_key" ON "flash_sale_products"("product_id");

ALTER TABLE "flash_sale_products" ADD CONSTRAINT "flash_sale_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "coupon_categories" (
    "coupon_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "coupon_categories_pkey" PRIMARY KEY ("coupon_id","category_id")
);

CREATE INDEX "idx_coupon_categories_category_id" ON "coupon_categories"("category_id");

ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "site_marketing_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_visit_coupon_code" VARCHAR(80),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_marketing_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "site_marketing_settings" ("id", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP);
