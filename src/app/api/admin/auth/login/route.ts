import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prismaDB";
import { signJwt } from "@/lib/auth/jwt";
import { getAuthSecret, setSessionCookie } from "@/lib/auth/session";
import { rateLimitStrict } from "@/lib/security/rateLimit";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "MANAGER", "STAFF", "SUPPORT"]);
const SESSION_TTL = 60 * 60 * 8; // 8-hour session for admin

export async function POST(req: NextRequest) {
  try {
    await rateLimitStrict(`admin_login:${req.ip ?? "unknown"}`, 1);
  } catch {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.users.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      is_active: true,
      user_roles: { select: { roles: { select: { name: true } } } },
    },
  });

  // Constant-time response to avoid user enumeration
  const dummyHash = "$2b$12$invalidhashfortimingprotection000000000000000000000000";
  const hashToCheck = user?.password_hash ?? dummyHash;
  const passwordOk = await bcrypt.compare(password, hashToCheck);

  if (!user || !user.is_active || !passwordOk) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const roles = user.user_roles.map((ur) => ur.roles.name);
  const hasAdminRole = roles.some((r) => ADMIN_ROLES.has(r));

  if (!hasAdminRole) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signJwt(
    { sub: user.id, email: user.email, roles },
    getAuthSecret(),
    SESSION_TTL
  );

  await setSessionCookie(token, SESSION_TTL);
  return NextResponse.json({ ok: true });
}
