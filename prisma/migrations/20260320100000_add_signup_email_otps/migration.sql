-- E-commerce core + signup_email_otps in one migration (shadow DB: users must exist before OTP FK).
-- Core from prisma/step3-ecommerce-schema.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- CITEXT type for emails

-- =========================
-- ENUM TYPES
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE user_role_type AS ENUM ('SUPER_ADMIN', 'MANAGER', 'STAFF', 'SUPPORT', 'CUSTOMER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_type') THEN
    CREATE TYPE order_status_type AS ENUM (
      'PENDING',
      'PAYMENT_FAILED',
      'CONFIRMED',
      'CANCELLED',
      'SHIPPED',
      'DELIVERED',
      'RETURN_REQUESTED',
      'RETURN_APPROVED',
      'RETURN_REJECTED',
      'REFUNDED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
    CREATE TYPE payment_status_type AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_status_type') THEN
    CREATE TYPE shipment_status_type AS ENUM ('PENDING', 'CREATED', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'RETURNED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status_type') THEN
    CREATE TYPE return_status_type AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');
  END IF;
END $$;

-- =========================
-- USERS & ROLES
-- =========================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            VARCHAR(150),
  phone           VARCHAR(30),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        user_role_type NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE user_roles (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id   UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE admin_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- CATEGORIES & BRANDS
-- =========================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(160) NOT NULL UNIQUE,
  description TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE TABLE brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(160) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- PRODUCTS
-- =========================
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL UNIQUE,
  short_description TEXT,
  description       TEXT,
  age_group         VARCHAR(50),
  base_price        NUMERIC(10,2) NOT NULL,
  discounted_price  NUMERIC(10,2),
  sku               VARCHAR(100),
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand_id          UUID REFERENCES brands(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector     tsvector
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_age_group ON products(age_group);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- =========================
-- PRODUCT VARIANTS
-- =========================
CREATE TABLE product_variants (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                 UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name                       VARCHAR(255),
  sku                        VARCHAR(120),
  color                      VARCHAR(80),
  size                       VARCHAR(80),
  additional_data            JSONB,
  price_override             NUMERIC(10,2),
  discounted_price_override  NUMERIC(10,2),
  is_default                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- =========================
-- PRODUCT IMAGES
-- =========================
CREATE TABLE product_images (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  url                TEXT NOT NULL,
  alt_text           VARCHAR(255),
  sort_order         INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_variant_id ON product_images(product_variant_id);

-- =========================
-- REVIEWS
-- =========================
CREATE TABLE reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
  rating                INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                 VARCHAR(255),
  comment               TEXT,
  is_verified_purchase  BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved);

-- =========================
-- CART & WISHLIST
-- =========================
CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_token UUID,
  status      VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_carts_user_active ON carts(user_id) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX idx_carts_guest_active ON carts(guest_token) WHERE status = 'ACTIVE';

CREATE TABLE cart_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id            UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity           INT NOT NULL CHECK (quantity > 0),
  unit_price         NUMERIC(10,2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

CREATE TABLE wishlists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wishlist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wishlist_id, product_id)
);

-- =========================
-- ADDRESSES
-- =========================
CREATE TABLE addresses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name           VARCHAR(150) NOT NULL,
  phone               VARCHAR(30) NOT NULL,
  line1               VARCHAR(255) NOT NULL,
  line2               VARCHAR(255),
  city                VARCHAR(120) NOT NULL,
  state               VARCHAR(120) NOT NULL,
  postal_code         VARCHAR(20) NOT NULL,
  country             VARCHAR(80) NOT NULL,
  is_default_billing  BOOLEAN NOT NULL DEFAULT FALSE,
  is_default_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- =========================
-- COUPONS
-- =========================
CREATE TABLE coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(80) NOT NULL UNIQUE,
  description         TEXT,
  discount_type       VARCHAR(30) NOT NULL, -- PERCENTAGE | FIXED
  discount_value      NUMERIC(10,2) NOT NULL,
  min_cart_value      NUMERIC(10,2),
  max_discount_value  NUMERIC(10,2),
  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  max_uses            INT,
  max_uses_per_user   INT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- ORDERS (must exist before coupon_usages FK to orders)
-- =========================
CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  status               order_status_type NOT NULL DEFAULT 'PENDING',
  payment_status       payment_status_type NOT NULL DEFAULT 'PENDING',
  subtotal_amount      NUMERIC(10,2) NOT NULL,
  discount_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount         NUMERIC(10,2) NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'INR',
  coupon_id            UUID REFERENCES coupons(id) ON DELETE SET NULL,
  shipping_address_id  UUID REFERENCES addresses(id) ON DELETE SET NULL,
  billing_address_id   UUID REFERENCES addresses(id) ON DELETE SET NULL,
  external_payment_id  VARCHAR(255),
  payment_provider     VARCHAR(80),
  is_gift              BOOLEAN NOT NULL DEFAULT FALSE,
  gift_message         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- COUPON USAGE (after orders exists)
CREATE TABLE coupon_usages (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id  UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- ORDER ITEMS
-- =========================
CREATE TABLE order_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name       VARCHAR(255) NOT NULL,
  sku                VARCHAR(120),
  unit_price         NUMERIC(10,2) NOT NULL,
  quantity           INT NOT NULL CHECK (quantity > 0),
  subtotal_amount    NUMERIC(10,2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- =========================
-- INVENTORY
-- =========================
CREATE TABLE inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id  UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  available_quantity  INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  reserved_quantity   INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  sold_quantity       INT NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, product_variant_id)
);

CREATE INDEX idx_inventory_available ON inventory(available_quantity);
CREATE INDEX idx_inventory_low_stock ON inventory(available_quantity, low_stock_threshold);

CREATE TABLE inventory_reservations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id      UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity           INT NOT NULL CHECK (quantity > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at        TIMESTAMPTZ
);

CREATE INDEX idx_reservations_order_id ON inventory_reservations(order_id);

-- =========================
-- SHIPMENTS
-- =========================
CREATE TABLE shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number VARCHAR(255),
  carrier         VARCHAR(120),
  status          shipment_status_type NOT NULL DEFAULT 'PENDING',
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_status ON shipments(status);

-- =========================
-- RETURNS
-- =========================
CREATE TABLE returns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  quantity     INT NOT NULL CHECK (quantity > 0),
  reason       TEXT,
  status       return_status_type NOT NULL DEFAULT 'REQUESTED',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  refund_amount NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_user_id ON returns(user_id);
CREATE INDEX idx_returns_status ON returns(status);

-- =========================
-- AUDIT LOGS
-- =========================
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id   UUID,
  action      VARCHAR(80) NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);


-- signup_email_otps (FK requires users table above)
CREATE TABLE "signup_email_otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_email_otps_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "signup_email_otps"
ADD CONSTRAINT "signup_email_otps_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

CREATE INDEX "signup_email_otps_email_idx" ON "signup_email_otps"("email");
CREATE INDEX "signup_email_otps_expires_at_idx" ON "signup_email_otps"("expires_at");