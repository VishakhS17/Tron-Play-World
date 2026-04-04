-- Storefront footer Help & Support + homepage Visit us (single settings row).
ALTER TABLE "site_marketing_settings" ADD COLUMN "help_support_title" VARCHAR(120);
ALTER TABLE "site_marketing_settings" ADD COLUMN "contact_address" TEXT;
ALTER TABLE "site_marketing_settings" ADD COLUMN "contact_phone" VARCHAR(80);
ALTER TABLE "site_marketing_settings" ADD COLUMN "contact_email" VARCHAR(200);
ALTER TABLE "site_marketing_settings" ADD COLUMN "social_facebook_url" VARCHAR(500);
ALTER TABLE "site_marketing_settings" ADD COLUMN "social_twitter_url" VARCHAR(500);
ALTER TABLE "site_marketing_settings" ADD COLUMN "social_instagram_url" VARCHAR(500);
ALTER TABLE "site_marketing_settings" ADD COLUMN "social_linkedin_url" VARCHAR(500);
ALTER TABLE "site_marketing_settings" ADD COLUMN "visit_eyebrow" VARCHAR(120);
ALTER TABLE "site_marketing_settings" ADD COLUMN "visit_heading" VARCHAR(255);
ALTER TABLE "site_marketing_settings" ADD COLUMN "visit_location_label" VARCHAR(120);
