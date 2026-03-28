import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/account", "/cart", "/checkout", "/orders", "/wishlist"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
