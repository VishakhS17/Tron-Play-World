import { NextRequest, NextResponse } from "next/server";
import { getShopListing } from "@/lib/shop/shopListing";

export async function GET(req: NextRequest) {
  const result = await getShopListing(new URL(req.url).searchParams);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
