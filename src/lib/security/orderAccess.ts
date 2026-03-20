import crypto from "crypto";

const ORDER_ACCESS_TTL_SECONDS = 60 * 60 * 24; // 24 hours

type OrderAccessPayload = {
  orderId: string;
  exp: number;
};

function base64UrlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from((input + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export function createOrderAccessToken(orderId: string) {
  const payload: OrderAccessPayload = {
    orderId,
    exp: Math.floor(Date.now() / 1000) + ORDER_ACCESS_TTL_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSecret()).update(encoded).digest();
  return `${encoded}.${base64UrlEncode(sig)}`;
}

export function verifyOrderAccessToken(token: string, orderId: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, encodedSig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(encodedPayload).digest();
  const actualSig = base64UrlDecode(encodedSig);
  if (expectedSig.length !== actualSig.length) return false;
  if (!crypto.timingSafeEqual(expectedSig, actualSig)) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as OrderAccessPayload;
    const now = Math.floor(Date.now() / 1000);
    return payload.orderId === orderId && payload.exp > now;
  } catch {
    return false;
  }
}

