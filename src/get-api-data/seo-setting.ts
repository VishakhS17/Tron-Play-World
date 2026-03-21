import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

// get all seo settings
export const getSeoSettings = unstable_cache(
  async () => {
    try {
      // Step 3 DB schema does not include persisted SEO settings yet.
      // We return a minimal shape consumed by `src/app/layout.tsx`.
      return {
        siteTitle: process.env.SITE_NAME ?? "Play World",
        metadescription:
          "Play World – toys, games & play for every kid. Shop the best toys online.",
        metaKeywords: "toys, toy store, kids toys, games",
        metaImage: null as string | null,
        favicon: null as string | null,
        gtmId: null as string | null,
        siteName: process.env.SITE_NAME ?? "Play World",
      };
    } catch {
      return null;
    }
  },
  ['seo-setting'], { tags: ['seo-setting'] }
);

export const getSiteName = unstable_cache(
  async () => {
    try {
      return process.env.SITE_NAME ? process.env.SITE_NAME : "Play World";
    } catch {
      return process.env.SITE_NAME ? process.env.SITE_NAME : "Play World";
    }
  },
  ['site-name'], { tags: ['site-name'] }
);

// get logo 
export const getLogo = unstable_cache(
  async () => {
    // Step 3 DB schema does not include persisted header settings yet.
    return "/images/logo/logo.svg";
  },
  ['header-logo'], { tags: ['header-logo'] }
);

// get email logo
export const getEmailLogo = unstable_cache(
  async () => {
    return "/images/logo/logo.svg";
  },
  ['email-logo'], { tags: ['email-logo'] }
);

