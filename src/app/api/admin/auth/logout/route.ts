import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
  );
}
