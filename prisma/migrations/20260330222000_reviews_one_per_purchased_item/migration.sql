-- Enforce one review per purchased order item.
ALTER TABLE "reviews"
ADD COLUMN "order_item_id" UUID;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "reviews_order_item_id_key" ON "reviews"("order_item_id");
