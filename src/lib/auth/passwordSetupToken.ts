import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 32;
export const PASSWORD_SETUP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function base64UrlEncode(buf: Buffer) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Raw token goes to the customer (email URL only). Never persist raw. */
export function generatePasswordSetupSecret() {
  const raw = base64UrlEncode(randomBytes(TOKEN_BYTES));
  const token_hash = createHash("sha256").update(raw, "utf8").digest("hex");
  return { raw, token_hash };
}

export function hashPasswordSetupToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
