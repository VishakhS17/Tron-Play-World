import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prismaDB";
import { signJwt } from "@/lib/auth/jwt";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { sendEmail } from "@/lib/email";
import { getAuthSecret } from "@/lib/auth/session";
import { validateCommonEmailProvider } from "@/lib/validateEmai";
import { cleanText, normalizeEmail, normalizePhone, readJsonBody, hasSuspiciousInput } from "@/lib/validation/input";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const OTP_TTL_SECONDS = 60 * 10; // 10 minutes
const OTP_COOKIE_NAME = "tpw_signup_otp";

function generateOtpCode() {
  // 6-digit numeric OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

function canExposeOtpForDebug() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.OTP_DEBUG_EXPOSE === "true"
  );
}

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

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body;

  const name = cleanText(body.name, 150);
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (!validateCommonEmailProvider(email)) {
    return NextResponse.json(
      { error: "Use a common email provider (Gmail, Yahoo, Outlook, etc.)" },
      { status: 400 }
    );
  }
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone.replace(/\s+/g, ""))) {
    return NextResponse.json({ error: "Please enter a valid mobile number" }, { status: 400 });
  }
  if (hasSuspiciousInput(name) || hasSuspiciousInput(email) || (phone && hasSuspiciousInput(phone))) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.customers.findFirst({
    where: {
      OR: [{ email }, ...(phone ? [{ phone }] : [])],
    },
  });
  if (existing) {
    if (existing.phone && phone && existing.phone === phone) {
      return NextResponse.json({ error: "Mobile number is already registered" }, { status: 409 });
    }
    if (existing.is_active) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Existing but unverified account: issue a fresh OTP instead of hard failing.
    const otpCode = generateOtpCode();
    const otpCodeHash = await bcrypt.hash(otpCode, 12);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.signup_email_otps.create({
      data: {
        customer_id: existing.id,
        email,
        code_hash: otpCodeHash,
        expires_at: otpExpiresAt,
      },
    });

    const emailResult = await sendEmail({
      to: existing.email,
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
        userId: existing.id,
        emailSent: !emailResult?.skipped,
        ...(canExposeOtpForDebug() && emailResult?.skipped
          ? { devOtp: otpCode }
          : {}),
      },
      { status: 200 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const otpCode = generateOtpCode();
  const otpCodeHash = await bcrypt.hash(otpCode, 12);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Create user and default role assignment in a transaction.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.customers.create({
      data: {
        email,
        password_hash: passwordHash,
        name: name || null,
        phone: phone || null,
        is_active: false, // Activated after OTP verification
      },
      select: { id: true, email: true },
    });

    await tx.signup_email_otps.create({
      data: {
        customer_id: created.id,
        email,
        code_hash: otpCodeHash,
        expires_at: otpExpiresAt,
      },
    });

    return created;
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

  return NextResponse.json({
    ok: true,
    requiresOtp: true,
    userId: user.id,
    emailSent: !emailResult?.skipped,
    ...(canExposeOtpForDebug() && emailResult?.skipped
      ? { devOtp: otpCode }
      : {}),
  }, { status: 201 });
}

