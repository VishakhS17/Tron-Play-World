import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prismaDB";
import { signJwt } from "@/lib/auth/jwt";
import { getAuthSecret, setSessionCookie } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { sendEmail } from "@/lib/email";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`verify-otp:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const otp = typeof body?.otp === "string" ? body.otp : "";

  if (!userId || !otp) {
    return NextResponse.json({ error: "userId and otp are required" }, { status: 400 });
  }

  const otpRecord = await prisma.signup_email_otps.findFirst({
    where: { user_id: userId, used_at: null },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      user_id: true,
      email: true,
      code_hash: true,
      expires_at: true,
      attempts: true,
      user: {
        select: { id: true, email: true, name: true, is_active: true },
      },
    },
  });

  if (!otpRecord) {
    return NextResponse.json({ error: "OTP not found" }, { status: 400 });
  }
  if (otpRecord.user?.is_active) {
    return NextResponse.json({ error: "Account already verified" }, { status: 400 });
  }

  if (otpRecord.expires_at <= new Date()) {
    return NextResponse.json({ error: "OTP expired" }, { status: 400 });
  }

  const MAX_ATTEMPTS = 5;
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "OTP attempts exceeded" }, { status: 429 });
  }

  const otpOk = await bcrypt.compare(otp, otpRecord.code_hash);
  if (!otpOk) {
    await prisma.signup_email_otps.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }

  // Activate user and mark OTP as used
  await prisma.$transaction(async (tx) => {
    await tx.users.update({
      where: { id: userId },
      data: { is_active: true },
    });
    await tx.signup_email_otps.update({
      where: { id: otpRecord.id },
      data: { used_at: new Date() },
    });
  });

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, is_active: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const roles = await prisma.user_roles.findMany({
    where: { user_id: userId },
    select: { roles: { select: { name: true } } },
  });
  const roleNames = roles.map((r) => r.roles.name) as string[];

  const token = signJwt(
    { sub: user.id, email: user.email, roles: roleNames },
    getAuthSecret(),
    SESSION_TTL_SECONDS
  );
  await setSessionCookie(token, SESSION_TTL_SECONDS);

  // Welcome email (best-effort; skipped if email not configured)
  await sendEmail({
    to: user.email,
    subject: "Welcome to i-Robox!",
    html:
      "<div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.5\">" +
      "<h2>Welcome" +
      (user.name ? ", " + user.name : "") +
      "!</h2>" +
      "<p>Thanks for creating your account. We are excited to have you at i-Robox.</p>" +
      "<p>Happy shopping!</p>" +
      "</div>",
  }).catch(() => ({ ok: false, skipped: true }));

  return NextResponse.json({ ok: true }, { status: 200 });
}

