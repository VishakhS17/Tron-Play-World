-- Marker to avoid duplicate low-stock alert emails.
ALTER TABLE "inventory"
ADD COLUMN "low_stock_alert_sent_at" TIMESTAMPTZ(6);
