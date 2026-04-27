import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getAdminSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";
import { isUuid } from "@/lib/validation/input";

function isAllowed(roles: string[]) {
  return (
    roles.includes("SUPER_ADMIN") ||
    roles.includes("MANAGER") ||
    roles.includes("STAFF") ||
    roles.includes("SUPPORT")
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    assertSameOrigin(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  const session = await getAdminSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.categories.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Cannot delete this category because products/types or child categories are linked to it.",
        },
        { status: 409 }
      );
    }
    console.error("[categories DELETE]", e);
    return NextResponse.json({ error: "Could not delete category" }, { status: 409 });
  }
}
