import { cache } from "react";
import { prisma } from "@/lib/prismaDB";
import { SITE_MARKETING_SETTINGS_ID } from "@/lib/marketing/siteSettingsId";

/** Resolved storefront strings (footer + homepage Visit us). */
export type StoreContactDisplay = {
  helpSupportTitle: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  socialFacebookUrl: string;
  socialTwitterUrl: string;
  socialInstagramUrl: string;
  socialLinkedInUrl: string;
  visitEyebrow: string;
  visitHeading: string;
  visitLocationLabel: string;
};

const DEFAULTS: StoreContactDisplay = {
  helpSupportTitle: "Help & Support",
  contactAddress:
    "24, Basement, 21st Main Rd, Banashankari Stage II, Banashankari, Bengaluru, Karnataka 560070",
  contactPhone: "+91 98447 16214",
  contactEmail: "support@example.com",
  socialFacebookUrl: "",
  socialTwitterUrl: "",
  socialInstagramUrl: "",
  socialLinkedInUrl: "",
  visitEyebrow: "Visit us",
  visitHeading: "Find us in Bengaluru.",
  visitLocationLabel: "Location",
};

function orDefault(row: string | null | undefined, fallback: string) {
  const t = row?.trim();
  return t ? t : fallback;
}

/** `tel:` href from a display phone string (spaces stripped). */
export function phoneToTelHref(phone: string) {
  const compact = phone.replace(/\s+/g, "");
  if (!compact) return "tel:";
  return compact.startsWith("+") ? `tel:${compact}` : `tel:${compact}`;
}

export const getStoreContactDisplay = cache(async function getStoreContactDisplay(): Promise<StoreContactDisplay> {
  const row = await prisma.site_marketing_settings
    .findUnique({
      where: { id: SITE_MARKETING_SETTINGS_ID },
      select: {
        help_support_title: true,
        contact_address: true,
        contact_phone: true,
        contact_email: true,
        social_facebook_url: true,
        social_twitter_url: true,
        social_instagram_url: true,
        social_linkedin_url: true,
        visit_eyebrow: true,
        visit_heading: true,
        visit_location_label: true,
      },
    })
    .catch(() => null);

  if (!row) return { ...DEFAULTS };

  return {
    helpSupportTitle: orDefault(row.help_support_title, DEFAULTS.helpSupportTitle),
    contactAddress: orDefault(row.contact_address, DEFAULTS.contactAddress),
    contactPhone: orDefault(row.contact_phone, DEFAULTS.contactPhone),
    contactEmail: orDefault(row.contact_email, DEFAULTS.contactEmail),
    socialFacebookUrl: orDefault(row.social_facebook_url, DEFAULTS.socialFacebookUrl),
    socialTwitterUrl: orDefault(row.social_twitter_url, DEFAULTS.socialTwitterUrl),
    socialInstagramUrl: orDefault(row.social_instagram_url, DEFAULTS.socialInstagramUrl),
    socialLinkedInUrl: orDefault(row.social_linkedin_url, DEFAULTS.socialLinkedInUrl),
    visitEyebrow: orDefault(row.visit_eyebrow, DEFAULTS.visitEyebrow),
    visitHeading: orDefault(row.visit_heading, DEFAULTS.visitHeading),
    visitLocationLabel: orDefault(row.visit_location_label, DEFAULTS.visitLocationLabel),
  };
});
