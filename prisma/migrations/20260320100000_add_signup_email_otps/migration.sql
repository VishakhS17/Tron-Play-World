-- CreateTable
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

-- AddForeignKey
ALTER TABLE "signup_email_otps"
ADD CONSTRAINT "signup_email_otps_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

-- CreateIndex
CREATE INDEX "signup_email_otps_email_idx" ON "signup_email_otps"("email");

-- CreateIndex
CREATE INDEX "signup_email_otps_expires_at_idx" ON "signup_email_otps"("expires_at");

