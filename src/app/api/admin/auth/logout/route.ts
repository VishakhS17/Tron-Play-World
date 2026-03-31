import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  await clearAdminSessionCookie();
  // 303 ensures browser follows redirect with GET after POST logout.
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
