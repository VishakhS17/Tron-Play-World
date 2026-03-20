import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { requireAdminWrite } from "@/lib/admin/rbac";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`admin_coupons_post:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await requireAdminWrite();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const code = String(body.code ?? "").trim().toUpperCase();
  const discount_type = String(body.discount_type ?? "PERCENTAGE").trim();
  const discount_value = Number(body.discount_value);
  const min_cart_value = body.min_cart_value ? Number(body.min_cart_value) : null;
  const max_uses = body.max_uses ? Number(body.max_uses) : null;
  const max_uses_per_user = body.max_uses_per_user ? Number(body.max_uses_per_user) : null;
  const starts_at = body.starts_at ? new Date(body.starts_at) : null;
  const ends_at = body.ends_at ? new Date(body.ends_at) : null;
  const is_active = Boolean(body.is_active);

  if (!code || !Number.isFinite(discount_value)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const created = await prisma.coupons.create({
    data: {
      code,
      discount_type,
      discount_value,
      min_cart_value,
      max_uses,
      max_uses_per_user,
      starts_at,
      ends_at,
      is_active,
      applies_to_shipping: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

