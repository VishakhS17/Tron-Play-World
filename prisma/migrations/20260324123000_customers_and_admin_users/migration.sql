-- Split storefront identities into `customers` and staff into `admin_users`.
-- Roles (SUPER_ADMIN, MANAGER, STAFF, SUPPORT) apply only to admin_users via admin_user_roles.

-- 1) Remove legacy empty admin_users link table (replaced by full admin_accounts)
DROP TABLE IF EXISTS "admin_users" CASCADE;

-- 2) Rename core account table
ALTER TABLE "users" RENAME TO "customers";
ALTER TABLE "customers" RENAME CONSTRAINT "users_pkey" TO "customers_pkey";
ALTER INDEX IF EXISTS "users_email_key" RENAME TO "customers_email_key";

-- 3) Admin account table
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(150),
    "phone" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- 4) Copy staff credentials from customers that currently have an admin-capable role
INSERT INTO "admin_users" ("id", "email", "password_hash", "name", "phone", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), c."email", c."password_hash", c."name", c."phone", c."is_active", c."created_at", c."updated_at"
FROM "customers" c
WHERE EXISTS (
    SELECT 1
    FROM "user_roles" ur
    INNER JOIN "roles" r ON r."id" = ur."role_id"
    WHERE ur."user_id" = c."id"
      AND r."name"::text IN ('SUPER_ADMIN', 'MANAGER', 'STAFF', 'SUPPORT')
);

-- 5) New join table admin roles
CREATE TABLE "admin_user_roles" (
    "admin_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("admin_user_id","role_id")
);

INSERT INTO "admin_user_roles" ("admin_user_id", "role_id")
SELECT a."id", ur."role_id"
FROM "user_roles" ur
INNER JOIN "customers" c ON c."id" = ur."user_id"
INNER JOIN "admin_users" a ON a."email" = c."email"
INNER JOIN "roles" r ON r."id" = ur."role_id"
WHERE r."name"::text IN ('SUPER_ADMIN', 'MANAGER', 'STAFF', 'SUPPORT');

ALTER TABLE "admin_user_roles"
ADD CONSTRAINT "admin_user_roles_admin_user_id_fkey"
FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "admin_user_roles"
ADD CONSTRAINT "admin_user_roles_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

DROP TABLE "user_roles";

-- 6) Remove CUSTOMER role and narrow enum to admin roles only
DELETE FROM "roles" WHERE "name"::text = 'CUSTOMER';

CREATE TYPE "admin_role_type" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'STAFF', 'SUPPORT');
ALTER TABLE "roles" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "roles" ALTER COLUMN "name" TYPE "admin_role_type" USING (("name")::text::"admin_role_type");
DROP TYPE "user_role_type";

-- 7) Rename user_id -> customer_id on customer-scoped tables
ALTER TABLE "addresses" DROP CONSTRAINT IF EXISTS "addresses_user_id_fkey";
ALTER TABLE "addresses" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_user_id_fkey";
ALTER TABLE "carts" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "coupon_usages" DROP CONSTRAINT IF EXISTS "coupon_usages_user_id_fkey";
ALTER TABLE "coupon_usages" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_user_id_fkey";
ALTER TABLE "orders" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "returns" DROP CONSTRAINT IF EXISTS "returns_user_id_fkey";
ALTER TABLE "returns" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "returns" ADD CONSTRAINT "returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_user_id_fkey";
ALTER TABLE "reviews" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "signup_email_otps" DROP CONSTRAINT IF EXISTS "signup_email_otps_user_id_fkey";
ALTER TABLE "signup_email_otps" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "signup_email_otps" ADD CONSTRAINT "signup_email_otps_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "wishlists" DROP CONSTRAINT IF EXISTS "wishlists_user_id_fkey";
ALTER TABLE "wishlists" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- 8) Audit log: customer actor + optional admin actor
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_user_id_fkey";
ALTER TABLE "audit_logs" RENAME COLUMN "user_id" TO "customer_id";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "audit_logs" ADD COLUMN "admin_user_id" UUID;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS "idx_audit_admin_user" ON "audit_logs"("admin_user_id");
