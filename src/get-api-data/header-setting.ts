import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

// get all header settings
export const getHeaderSettings = unstable_cache(
  async () => {
    try {
      return await prisma.headerSetting.findFirst();
    } catch {
      return null;
    }
  },
  ['header-setting'], { tags: ['header-setting'] }
);
