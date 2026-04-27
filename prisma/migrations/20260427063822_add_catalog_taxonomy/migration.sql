-- Catalog taxonomy: types (per category), subtypes (per type), collections, optional FKs on products.
-- Idempotent for environments that may re-apply: use IF NOT EXISTS where supported (PostgreSQL).

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_subtypes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_type_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_subtypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_collections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_types_slug_key" ON "product_types"("slug");
CREATE INDEX IF NOT EXISTS "idx_product_types_category_id" ON "product_types"("category_id");
CREATE INDEX IF NOT EXISTS "idx_product_types_is_active" ON "product_types"("is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "product_subtypes_slug_key" ON "product_subtypes"("slug");
CREATE INDEX IF NOT EXISTS "idx_product_subtypes_type_id" ON "product_subtypes"("product_type_id");
CREATE INDEX IF NOT EXISTS "idx_product_subtypes_is_active" ON "product_subtypes"("is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "product_collections_slug_key" ON "product_collections"("slug");
CREATE INDEX IF NOT EXISTS "idx_product_collections_is_active" ON "product_collections"("is_active");

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "type_id" UUID;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subtype_id" UUID;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "collection_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_products_type_id" ON "products"("type_id");
CREATE INDEX IF NOT EXISTS "idx_products_subtype_id" ON "products"("subtype_id");
CREATE INDEX IF NOT EXISTS "idx_products_collection_id" ON "products"("collection_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_types_category_id_fkey'
  ) THEN
    ALTER TABLE "product_types" ADD CONSTRAINT "product_types_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_subtypes_product_type_id_fkey'
  ) THEN
    ALTER TABLE "product_subtypes" ADD CONSTRAINT "product_subtypes_product_type_id_fkey"
      FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_type_id_fkey'
  ) THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_type_id_fkey"
      FOREIGN KEY ("type_id") REFERENCES "product_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_subtype_id_fkey'
  ) THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_subtype_id_fkey"
      FOREIGN KEY ("subtype_id") REFERENCES "product_subtypes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_collection_id_fkey'
  ) THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_fkey"
      FOREIGN KEY ("collection_id") REFERENCES "product_collections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END$$;
