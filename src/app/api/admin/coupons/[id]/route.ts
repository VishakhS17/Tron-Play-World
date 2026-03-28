import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { requireAdminWrite } from "@/lib/admin/rbac";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import {
  cleanText,
  hasSuspiciousInput,
  isAllowedCouponDiscountType,
  isUuid,
  normalizeCode,
  readJsonBody,
} from "@/lib/validation/input";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminWrite();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const coupon = await prisma.coupons.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      discount_type: true,
      discount_value: true,
      min_cart_value: true,
      max_uses: true,
      max_uses_per_user: true,
      starts_at: true,
      ends_at: true,
      is_active: true,
    },
  });
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(coupon, { status: 200 });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`admin_coupons_put:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await requireAdminWrite();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body;

  let code: string | undefined;
  if (body.code !== undefined) {
    if (typeof body.code !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    code = normalizeCode(body.code);
    if (!code || hasSuspiciousInput(code)) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }
  }

  let discount_type: string | undefined;
  if (body.discount_type !== undefined) {
    if (typeof body.discount_type !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const dt = cleanText(body.discount_type, 30);
    if (!isAllowedCouponDiscountType(dt)) {
      return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
    }
    discount_type = dt;
  }

  const updated = await prisma.coupons.update({
    where: { id },
    data: {
      code,
      discount_type,
      discount_value: body.discount_value !== undefined ? Number(body.discount_value) : undefined,
      min_cart_value: body.min_cart_value !== undefined && body.min_cart_value !== ""
        ? Number(body.min_cart_value)
        : null,
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: updated.id }, { status: 200 });
}

