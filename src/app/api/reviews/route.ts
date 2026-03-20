import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const productId = (url.searchParams.get("productId") ?? "").trim();
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  const reviews = await prisma.reviews.findMany({
    where: { product_id: productId, is_approved: true },
    orderBy: { created_at: "desc" },
    select: { id: true, rating: true, title: true, comment: true, created_at: true, is_verified_purchase: true },
  });

  return NextResponse.json({ items: reviews }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`reviews_post:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const productId = String(body.productId ?? "");
  const rating = Number(body.rating ?? 0);
  const title = typeof body.title === "string" ? body.title.slice(0, 255) : null;
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 2000) : "";

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment.trim()) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  // Verified purchase: must have a CONFIRMED order containing this product.
  const hasPurchase = await prisma.orders.count({
    where: {
      user_id: session.sub,
      status: "CONFIRMED",
      order_items: { some: { product_id: productId } },
    },
  });

  const created = await prisma.reviews.create({
    data: {
      product_id: productId,
      user_id: session.sub,
      rating,
      title,
      comment,
      is_verified_purchase: hasPurchase > 0,
      is_approved: false, // moderation required
    },
    select: { id: true },
  });

  await writeAuditLog({
    userId: session.sub,
    entityType: "REVIEW",
    entityId: created.id,
    action: "REVIEW_SUBMITTED",
    newValues: { productId, rating, verified: hasPurchase > 0 },
    ipAddress: req.ip ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

