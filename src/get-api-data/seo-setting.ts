import { unstable_cache } from "next/cache";

// get all seo settings
export const getSeoSettings = unstable_cache(
  async () => {
    try {
      // Step 3 DB schema does not include persisted SEO settings yet.
      // We return a minimal shape consumed by `src/app/layout.tsx`.
      return {
        siteTitle: process.env.SITE_NAME ?? "i-Robox",
        metadescription:
          "i-Robox – diecast models, collectibles & play. Shop online.",
        metaKeywords: "toys, toy store, kids toys, games",
        metaImage: null as string | null,
        favicon: null as string | null,
        gtmId: null as string | null,
        siteName: process.env.SITE_NAME ?? "i-Robox",
      };
    } catch {
      return null;
    }
  },
  ['seo-setting'], { tags: ['seo-setting'] }
);
