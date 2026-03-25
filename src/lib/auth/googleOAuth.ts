import type { NextRequest } from "next/server";
import crypto from "crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "tpw_google_oauth_state";
export const GOOGLE_OAUTH_NEXT_COOKIE = "tpw_google_oauth_next";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }
  return { clientId, clientSecret };
}

export function getSiteOrigin(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? process.env.SITE_URL;
  if (env) {
    try {
      return new URL(env).origin;
    } catch {
      // fall through
    }
  }
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host");
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export function googleRedirectUri(req: NextRequest) {
  return `${getSiteOrigin(req)}/api/auth/google/callback`;
}

/** Safe internal path for post-login redirect (no open redirects). */
export function sanitizeOAuthNextParam(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  if (trimmed.length > 512 || /[\r\n\0]/.test(trimmed)) return "/";
  return trimmed;
}

export function randomOAuthState() {
  return crypto.randomBytes(32).toString("hex");
}

export function buildGoogleAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const u = new URL(GOOGLE_AUTH);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", params.state);
  u.searchParams.set("prompt", "select_account");
  u.searchParams.set("access_type", "online");
  return u.toString();
}

export async function exchangeGoogleCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ access_token: string }> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED:${res.status}:${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("GOOGLE_TOKEN_MISSING");
  return { access_token: data.access_token };
}

export type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GOOGLE_USERINFO_FAILED:${res.status}`);
  }
  return (await res.json()) as GoogleUserInfo;
}
