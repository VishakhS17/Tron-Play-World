/** Canonical public site origin (no trailing slash). */
export function getSiteBaseUrl(): string {
  const trimmed =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return trimmed || "http://localhost:3000";
}
