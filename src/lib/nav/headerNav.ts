import { prisma } from "@/lib/prismaDB";

export type HeaderNavBrand = { slug: string; name: string };

export type HeaderNavOtherGroup = {
  categoryName: string;
  categorySlug: string;
  brands: HeaderNavBrand[];
};

export type HeaderNavData = {
  diecastCategorySlug: string | null;
  carsBrands: HeaderNavBrand[];
  otherToyGroups: HeaderNavOtherGroup[];
};

type CatRow = { id: string; parent_id: string | null; name: string; slug: string };

function descendantsFromTree(
  rootId: string,
  childrenByParent: Map<string | null, string[]>
): string[] {
  const out = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const kid of childrenByParent.get(id) ?? []) {
      if (!out.has(kid)) {
        out.add(kid);
        queue.push(kid);
      }
    }
  }
  return [...out];
}

/**
 * Match merchandising "diecast" categories. Slugs/names like `die-cast-cars` or
 * `DIE CAST CARS` do not contain the substring `diecast`, so we also match
 * spaced/hyphenated "die … cast" forms.
 */
function matchesDiecastMerch(c: CatRow): boolean {
  const slug = c.slug.toLowerCase();
  const name = c.name.toLowerCase();
  for (const p of [slug, name]) {
    if (p.includes("diecast")) return true;
    if (/die\s*[-_]?\s*cast/i.test(p)) return true;
  }
  return false;
}

/** Union of subtrees for every category that looks like diecast merch. */
function diecastCategoryIdsAndSlug(
  allCats: CatRow[],
  childrenByParent: Map<string | null, string[]>
): { ids: string[]; shopCategorySlug: string | null } {
  const seeds = allCats.filter(matchesDiecastMerch);
  if (seeds.length === 0) {
    return { ids: [], shopCategorySlug: null };
  }

  const idSet = new Set<string>();
  for (const s of seeds) {
    for (const id of descendantsFromTree(s.id, childrenByParent)) {
      idSet.add(id);
    }
  }

  const byId = new Map(allCats.map((c) => [c.id, c]));
  function depthFromRoot(id: string): number {
    let d = 0;
    let cur = byId.get(id);
    while (cur?.parent_id) {
      d++;
      cur = byId.get(cur.parent_id);
    }
    return d;
  }

  const rootSeeds = seeds
    .filter((s) => s.parent_id === null)
    .sort((a, b) => a.name.localeCompare(b.name));
  let shopCategorySlug: string;
  if (rootSeeds.length > 0) {
    shopCategorySlug = rootSeeds[0].slug;
  } else {
    const sorted = [...seeds].sort(
      (a, b) =>
        depthFromRoot(a.id) - depthFromRoot(b.id) ||
        a.slug.localeCompare(b.slug)
    );
    shopCategorySlug = sorted[0]!.slug;
  }

  return { ids: [...idSet], shopCategorySlug };
}

export async function getHeaderNavData(): Promise<HeaderNavData> {
  const allCats = await prisma.categories.findMany({
    select: { id: true, parent_id: true, name: true, slug: true },
  });

  const childrenByParent = new Map<string | null, string[]>();
  for (const c of allCats) {
    if (!childrenByParent.has(c.parent_id)) childrenByParent.set(c.parent_id, []);
    childrenByParent.get(c.parent_id)!.push(c.id);
  }

  const { ids: diecastIds, shopCategorySlug } = diecastCategoryIdsAndSlug(
    allCats,
    childrenByParent
  );
  const diecastSet = new Set(diecastIds);

  const carsBrands =
    diecastIds.length > 0
      ? await prisma.brands.findMany({
          where: {
            products: {
              some: {
                is_active: true,
                category_id: { in: diecastIds },
              },
            },
          },
          select: { slug: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const roots = allCats.filter((c) => c.parent_id === null).sort((a, b) => a.name.localeCompare(b.name));

  const otherToyGroups: HeaderNavOtherGroup[] = [];

  for (const root of roots) {
    const subIds = descendantsFromTree(root.id, childrenByParent);
    const allowedIds =
      diecastSet.size > 0
        ? subIds.filter((id) => !diecastSet.has(id))
        : subIds;

    // Whole root is diecast-only (e.g. top-level "Die Cast Cars") → Cars menu only.
    if (allowedIds.length === 0) continue;

    const brands = await prisma.brands.findMany({
      where: {
        products: {
          some: {
            is_active: true,
            category_id: { in: allowedIds },
          },
        },
      },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    });

    if (brands.length > 0) {
      otherToyGroups.push({
        categoryName: root.name,
        categorySlug: root.slug,
        brands,
      });
    }
  }

  return {
    diecastCategorySlug: shopCategorySlug,
    carsBrands,
    otherToyGroups,
  };
}
