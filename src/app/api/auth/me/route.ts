import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prismaDB";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 200 });

  const user = await prisma.users.findUnique({
    where: { id: session.sub },
    select: { name: true },
  });

  return NextResponse.json(
    {
      user: {
        id: session.sub,
        email: session.email,
        name: user?.name ?? null,
        roles: session.roles,
      },
    },
    { status: 200 }
  );
}

