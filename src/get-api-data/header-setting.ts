import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

// get all header settings
export const getHeaderSettings = unstable_cache(
  async () => {
    try {
      // Step 3 DB schema does not include persisted header settings yet.
      // Return a minimal compatible shape used by `MainHeader`.
      return {
        headerText:
          "Free delivery on orders over ₹2000 – toys for every age!",
        headerLogo: "/images/logo/logo.svg",
        emailLogo: "/images/logo/logo.svg",
      };
    } catch {
      return null;
    }
  },
  ['header-setting'], { tags: ['header-setting'] }
);
