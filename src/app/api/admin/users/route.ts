import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prismaDB";
import { getSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";

const ADMIN_ROLES = ["SUPER_ADMIN", "MANAGER", "STAFF", "SUPPORT"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

function isSuperAdmin(roles: string[]) {
  return roles.includes("SUPER_ADMIN");
}

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.users.findMany({
    where: {
      user_roles: {
        some: { roles: { name: { in: [...ADMIN_ROLES] } } },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      is_active: true,
      created_at: true,
      user_roles: { select: { roles: { select: { name: true } } } },
    },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      is_active: u.is_active,
      roles: u.user_roles.map((ur) => ur.roles.name),
      created_at: u.created_at,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || !isSuperAdmin(session.roles)) {
    return NextResponse.json({ error: "Only SUPER_ADMIN can create admin users" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role: AdminRole = ADMIN_ROLES.includes(body?.role) ? body.role : "STAFF";
  const name = body?.name ? String(body.name).trim() : null;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.users.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  // Ensure the role exists
  const roleRow = await prisma.roles.upsert({
    where: { name: role },
    update: {},
    create: { name: role },
    select: { id: true },
  });

  const password_hash = await bcrypt.hash(password, 12);

  const user = await prisma.users.create({
    data: {
      email,
      password_hash,
      name,
      is_active: true,
      user_roles: {
        create: { role_id: roleRow.id },
      },
    },
    select: { id: true, email: true },
  });

  return NextResponse.json({ ok: true, id: user.id, email: user.email }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || !isSuperAdmin(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (!userId) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Prevent self-deletion
  if (userId === session.sub) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  await prisma.users.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
