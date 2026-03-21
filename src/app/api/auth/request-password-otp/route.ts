import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prismaDB";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { sendEmail } from "@/lib/email";
import { validateCommonEmailProvider, validateEmail } from "@/lib/validateEmai";
import { getSession } from "@/lib/auth/session";

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function canExposeOtpForDebug() {
  return process.env.NODE_ENV !== "production" || process.env.OTP_DEBUG_EXPOSE === "true";
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`request-password-otp:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const requestedUserId = typeof body?.userId === "string" ? body.userId : "";
  const session = await getSession();

  const normalizedIdentifier = identifier.toLowerCase();
  const byEmail = validateEmail(normalizedIdentifier);
  const byPhone = identifier.replace(/\s+/g, "");
  if (byEmail && !validateCommonEmailProvider(normalizedIdentifier)) {
    return NextResponse.json(
      { error: "Use a common email provider (Gmail, Yahoo, Outlook, etc.)" },
      { status: 400 }
    );
  }

  const user = requestedUserId
    ? await prisma.users.findUnique({
        where: { id: requestedUserId },
        select: { id: true, email: true, is_active: true },
      })
    : await prisma.users.findFirst({
        where: byEmail ? { email: normalizedIdentifier } : { phone: byPhone },
        select: { id: true, email: true, is_active: true },
      });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (requestedUserId && session?.sub && session.sub !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const otpCode = generateOtpCode();
  const otpCodeHash = await bcrypt.hash(otpCode, 12);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.signup_email_otps.create({
    data: {
      user_id: user.id,
      email: user.email,
      code_hash: otpCodeHash,
      expires_at: otpExpiresAt,
    },
  });

  const emailResult = await sendEmail({
    to: user.email,
    subject: "Your password reset OTP code",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.5">
        <h2>Password reset verification</h2>
        <p>Your OTP code is:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:2px;">${otpCode}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  }).catch(() => ({ ok: false, skipped: true }));

  return NextResponse.json({
    ok: true,
    userId: user.id,
    emailSent: !emailResult?.skipped,
    ...(canExposeOtpForDebug() && emailResult?.skipped ? { devOtp: otpCode } : {}),
  });
}
