import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";

function isAllowed(roles: string[]) {
  return (
    roles.includes("SUPER_ADMIN") ||
    roles.includes("MANAGER") ||
    roles.includes("STAFF") ||
    roles.includes("SUPPORT")
  );
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const categories = await prisma.categories.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, parent_id: true },
    });
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[categories GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  const session = await getSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Handle slug collisions by appending a short random suffix
  const existing = await prisma.categories.findUnique({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Math.random().toString(36).slice(2, 6)}` : slug;

  const category = await prisma.categories.create({
    data: { name, slug: finalSlug },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json(category, { status: 201 });
}
