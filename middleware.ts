import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "tpw_session";

function getSecret() {
  return process.env.NEXTAUTH_SECRET ?? null;
}

function base64UrlToBytes(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function verifyJwtEdge(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(sigB64), data);
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Admin login page is always accessible — no auth check
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = getSecret();

  if (!token || !secret) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return (async () => {
    const session = await verifyJwtEdge(token, secret);
    const roles = (session?.roles ?? []) as string[];
    const isAdmin =
      roles.includes("SUPER_ADMIN") ||
      roles.includes("MANAGER") ||
      roles.includes("STAFF") ||
      roles.includes("SUPPORT");

    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  })() as any;
}

export const config = {
  matcher: ["/admin/:path*"],
};
