-- Track one-time abandoned-cart reminder emails per server cart.
ALTER TABLE "carts" ADD COLUMN "abandoned_reminder_sent_at" TIMESTAMPTZ(6);
