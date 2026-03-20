import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prismaDB";
import { signJwt } from "@/lib/auth/jwt";
import { setSessionCookie, getAuthSecret } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`signup:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Create user and default role assignment in a transaction.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.users.create({
      data: {
        email,
        password_hash: passwordHash,
        name: name || null,
        is_active: true,
      },
      select: { id: true, email: true },
    });

    const customerRole = await tx.roles.upsert({
      where: { name: "CUSTOMER" },
      update: {},
      create: { name: "CUSTOMER", description: "Customer" },
      select: { id: true, name: true },
    });

    await tx.user_roles.create({
      data: { user_id: created.id, role_id: customerRole.id },
    });

    return created;
  });

  const token = signJwt(
    { sub: user.id, email: user.email, roles: ["CUSTOMER"] },
    getAuthSecret(),
    SESSION_TTL_SECONDS
  );
  await setSessionCookie(token, SESSION_TTL_SECONDS);

  return NextResponse.json({ ok: true }, { status: 201 });
}

