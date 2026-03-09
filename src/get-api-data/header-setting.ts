import { prisma } from "@/lib/prismaDB";
import { unstable_cache } from "next/cache";

// get all header settings
export const getHeaderSettings = unstable_cache(
  async () => {
    return await prisma.headerSetting.findFirst();
  },
  ['header-setting'], { tags: ['header-setting'] }
);
