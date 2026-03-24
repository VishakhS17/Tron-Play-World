import crypto from "crypto";

function base64UrlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const pad = 4 - (input.length % 4 || 4);
  const normalized = (input + "=".repeat(pad))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

export type JwtPayload = {
  /** customers.id for storefront JWT; admin_users.id for admin JWT */
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
};

export function signJwt(payload: Omit<JwtPayload, "iat" | "exp">, secret: string, ttlSeconds: number) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64UrlEncode(signature)}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSig] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest();
  const actualSig = base64UrlDecode(encodedSig);
  if (expectedSig.length !== actualSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

