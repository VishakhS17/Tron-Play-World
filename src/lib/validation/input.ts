import { NextRequest } from "next/server";

export type FieldErrors = Record<string, string>;

export function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

export function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = cleanText(value, maxLength);
  return cleaned.length ? cleaned : null;
}

export function normalizeEmail(value: unknown) {
  return cleanText(value, 320).toLowerCase();
}

export function normalizePhone(value: unknown) {
  const raw = cleanText(value, 30);
  return raw.replace(/\s+/g, "");
}

export function normalizeCode(value: unknown, maxLength = 80) {
  return cleanText(value, maxLength).toUpperCase();
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function hasSuspiciousInput(value: string) {
  // Lightweight payload check to reject obvious injection probes.
  return /(--|;\s*drop\s+table|\bunion\s+select\b|\bor\s+1=1\b)/i.test(value);
}

export async function readJsonBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false as const, body: null };
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false as const, body: null };
  }
  return { ok: true as const, body: body as Record<string, unknown> };
}
