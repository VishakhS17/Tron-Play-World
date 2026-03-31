-- One-time tokens for "set password" links (checkout-created customers). Raw token is never stored; SHA-256 hex only.

CREATE TABLE "customer_password_setup_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_password_setup_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_password_setup_token_hash" ON "customer_password_setup_tokens"("token_hash");
CREATE INDEX "idx_password_setup_customer_id" ON "customer_password_setup_tokens"("customer_id");

ALTER TABLE "customer_password_setup_tokens"
ADD CONSTRAINT "customer_password_setup_tokens_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
