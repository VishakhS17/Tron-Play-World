import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";

function isAllowed(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("MANAGER") || roles.includes("STAFF");
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const images = await prisma.product_images.findMany({
    where: { product_id: id },
    orderBy: { sort_order: "asc" },
    select: { id: true, url: true, alt_text: true, sort_order: true },
  });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body?.url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const maxOrder = await prisma.product_images.aggregate({
    _max: { sort_order: true },
    where: { product_id: id },
  });

  const image = await prisma.product_images.create({
    data: {
      product_id: id,
      url: String(body.url),
      alt_text: body.alt_text ? String(body.alt_text) : null,
      sort_order: (maxOrder._max.sort_order ?? -1) + 1,
    },
    select: { id: true, url: true, alt_text: true, sort_order: true },
  });
  return NextResponse.json(image, { status: 201 });
}

/** PATCH — update sort_order in bulk after drag-reorder.
 *  Body: { order: string[] }  — array of image IDs in their new order (0-indexed).
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: productId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.order)) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }
  const order: string[] = body.order;

  await Promise.all(
    order.map((imgId, i) =>
      prisma.product_images.updateMany({
        where: { id: imgId, product_id: productId },
        data: { sort_order: i },
      })
    )
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAllowed(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: productId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("imageId");
  if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });

  await prisma.product_images.deleteMany({
    where: { id: imageId, product_id: productId },
  });
  return NextResponse.json({ ok: true });
}
