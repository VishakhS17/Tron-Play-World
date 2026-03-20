import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prismaDB";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { sendEmail } from "@/lib/email";

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`resend-otp:${req.ip ?? "unknown"}`, 1);
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!userId && !email) {
    return NextResponse.json({ error: "userId or email is required" }, { status: 400 });
  }

  const user = await prisma.users.findFirst({
    where: userId ? { id: userId } : { email },
    select: { id: true, email: true, is_active: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.is_active) return NextResponse.json({ error: "Account already verified" }, { status: 400 });

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
    subject: "Your i-Robox OTP verification code",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.5">
        <h2>Verify your email</h2>
        <p>Your OTP code is:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:2px;">${otpCode}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  }).catch(() => ({ ok: false, skipped: true }));

  return NextResponse.json(
    {
      ok: true,
      requiresOtp: true,
      userId: user.id,
      emailSent: !emailResult?.skipped,
      ...(process.env.NODE_ENV !== "production" && emailResult?.skipped
        ? { devOtp: otpCode }
        : {}),
    },
    { status: 200 }
  );
}

