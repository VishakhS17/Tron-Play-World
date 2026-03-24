import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prismaDB";
import { isSyntheticPhoneSignupEmail } from "@/lib/auth/signupIdentifier";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 200 });

  const user = await prisma.customers.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true, phone: true },
  });

  const email =
    user?.email && !isSyntheticPhoneSignupEmail(user.email) ? user.email : null;
  const phone = user?.phone ?? null;

  return NextResponse.json(
    {
      user: {
        id: session.sub,
        email,
        phone,
        name: user?.name ?? null,
        roles: session.roles,
      },
    },
    { status: 200 }
  );
}

