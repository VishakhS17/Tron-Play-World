import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`coupon_validate:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getSession();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const code = String(body.code ?? "").trim();
  const subtotal = Number(body.subtotal ?? 0);

  if (!code) return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return NextResponse.json({ error: "Invalid subtotal" }, { status: 400 });
  }

  const coupon = await prisma.coupons.findFirst({
    where: { code, is_active: true },
    select: {
      id: true,
      code: true,
      discount_type: true,
      discount_value: true,
      min_cart_value: true,
      starts_at: true,
      ends_at: true,
      max_uses: true,
      max_uses_per_user: true,
    },
  });

  if (!coupon) return NextResponse.json({ error: "Invalid coupon" }, { status: 404 });

  const now = new Date();
  if (coupon.starts_at && coupon.starts_at > now) {
    return NextResponse.json({ error: "Coupon is not active yet" }, { status: 400 });
  }
  if (coupon.ends_at && coupon.ends_at < now) {
    return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
  }

  if (coupon.min_cart_value && subtotal < Number(coupon.min_cart_value)) {
    return NextResponse.json({ error: "Coupon minimum not met" }, { status: 400 });
  }

  if (coupon.max_uses) {
    const used = await prisma.coupon_usages.count({ where: { coupon_id: coupon.id } });
    if (used >= coupon.max_uses) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }
  }

  if (coupon.max_uses_per_user && session?.sub) {
    const usedByUser = await prisma.coupon_usages.count({
      where: { coupon_id: coupon.id, user_id: session.sub },
    });
    if (usedByUser >= coupon.max_uses_per_user) {
      return NextResponse.json({ error: "Coupon usage limit reached for your account" }, { status: 400 });
    }
  }

  const discount =
    coupon.discount_type === "PERCENTAGE"
      ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
      : Math.min(subtotal, Number(coupon.discount_value));

  return NextResponse.json({
    ok: true,
    coupon: { code: coupon.code },
    discount,
    total: Math.max(0, subtotal - discount),
  });
}

