-- Homepage highlights section title copy (Admin → Marketing → Highlights).
ALTER TABLE "site_marketing_settings" ADD COLUMN "highlights_section_eyebrow" VARCHAR(120);
ALTER TABLE "site_marketing_settings" ADD COLUMN "highlights_section_heading" VARCHAR(255);
