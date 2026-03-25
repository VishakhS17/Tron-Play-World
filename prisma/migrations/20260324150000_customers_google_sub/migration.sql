-- AlterTable
ALTER TABLE "customers" ADD COLUMN "google_sub" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "customers_google_sub_key" ON "customers"("google_sub");
