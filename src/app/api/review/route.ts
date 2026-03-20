import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(`review_legacy_post:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();

  const { productId } = body;

  try {
    const reviews = await prisma.reviews.findMany({
      where: {
        product_id: productId,
        is_approved: true,
      },
    });

    if (!reviews) {
      return NextResponse.json(
        { message: "No reviews found" },
        { status: 200 }
      );
    }

    return NextResponse.json({ review: reviews }, { status: 200 });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

