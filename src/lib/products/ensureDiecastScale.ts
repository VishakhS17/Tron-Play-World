import type { PrismaClient } from "@prisma/client";
import { normalizeDiecastScale } from "@/lib/products/diecastScales";

/** Find or create a scale row by canonical ratio (e.g. after CSV normalize). */
export async function ensureDiecastScaleId(
  prisma: PrismaClient,
  ratio: string
): Promise<string> {
  const existing = await prisma.diecast_scales.findUnique({
    where: { ratio },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.diecast_scales.create({
    data: { ratio, name: ratio },
    select: { id: true },
  });
  return created.id;
}

/** Parse CSV/admin text to ratio or null. */
export function ratioFromImportText(raw: string): string | null {
  return normalizeDiecastScale(raw.trim());
}
