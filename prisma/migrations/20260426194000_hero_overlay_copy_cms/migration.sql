ALTER TABLE "site_marketing_settings"
ADD COLUMN "hero_overlay_eyebrow" VARCHAR(120),
ADD COLUMN "hero_overlay_heading" VARCHAR(255),
ADD COLUMN "hero_overlay_subheading" TEXT,
ADD COLUMN "hero_overlay_cta_label" VARCHAR(120),
ADD COLUMN "hero_overlay_cta_href" VARCHAR(500);
