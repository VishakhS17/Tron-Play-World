import type { NextRequest } from "next/server";

function getAllowedOrigins() {
  const origins = new Set<string>();
  const fromEnv = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
    process.env.SITE_URL,
  ].filter(Boolean) as string[];
  for (const v of fromEnv) {
    try {
      origins.add(new URL(v).origin);
    } catch {
      // ignore
    }
  }
  return origins;
}

/**
 * Lightweight CSRF hardening for cookie-auth endpoints.
 * We require requests with an Origin header to match one of our configured site origins.
 * (SameSite cookies already help, this adds a stricter check for browsers.)
 */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients, or same-origin navigation without Origin
  const allowed = getAllowedOrigins();
  if (allowed.size === 0) return; // if not configured, don't block
  if (!allowed.has(origin)) {
    throw new Error("BAD_ORIGIN");
  }
}

