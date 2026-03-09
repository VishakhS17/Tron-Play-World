import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

// get all seo settings
export const getSeoSettings = unstable_cache(
  async () => {
    try {
      return await prisma.seoSetting.findFirst();
    } catch {
      return null;
    }
  },
  ['seo-setting'], { tags: ['seo-setting'] }
);

export const getSiteName = unstable_cache(
  async () => {
    try {
      const siteName = await prisma.seoSetting.findFirst({
        select: {
          siteName: true,
        },
      });
      return siteName ? siteName.siteName : process.env.SITE_NAME ? process.env.SITE_NAME : "i-Robox";
    } catch {
      return process.env.SITE_NAME ? process.env.SITE_NAME : "i-Robox";
    }
  },
  ['site-name'], { tags: ['site-name'] }
);

// get logo 
export const getLogo = unstable_cache(
  async () => {
    const headerLogo = await prisma.headerSetting.findFirst({
      select: {
        headerLogo: true,
      },
    });
    const logo = headerLogo ? headerLogo.headerLogo : "https://res.cloudinary.com/dc6svbdh9/image/upload/v1746335068/header/tsvfm6pvfwpbpyqdtxwn.svg";
    return logo;
  },
  ['header-logo'], { tags: ['header-logo'] }
);

// get email logo
export const getEmailLogo = unstable_cache(
  async () => {
    const emailLogo = await prisma.headerSetting.findFirst({
      select: {
        emailLogo: true,
      },
    });
    const logo = emailLogo ? emailLogo.emailLogo : "https://res.cloudinary.com/dc6svbdh9/image/upload/v1746693785/logo_ouegg7.png";
    return logo;
  },
  ['email-logo'], { tags: ['email-logo'] }
);

