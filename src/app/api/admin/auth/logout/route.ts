import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearAdminSessionCookie();
  return NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
  );
}
