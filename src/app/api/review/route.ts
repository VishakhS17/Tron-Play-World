import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { productSlug } = body;

  try {
    const reviews = await prisma.review.findMany({
      where: {
        AND: [
          {
            productSlug: productSlug,
          },
          {
            isApproved: true,
          },
        ]
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
};

