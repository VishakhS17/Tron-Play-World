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

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const OTP_TTL_SECONDS = 60 * 10; // 10 minutes
const OTP_COOKIE_NAME = "tpw_signup_otp";

function generateOtpCode() {
  // 6-digit numeric OTP
  return String(Math.floor(100000 + Math.random() * 900000));
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
    if (existing.is_active) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Existing but unverified account: issue a fresh OTP instead of hard failing.
    const otpCode = generateOtpCode();
    const otpCodeHash = await bcrypt.hash(otpCode, 12);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.signup_email_otps.create({
      data: {
        user_id: existing.id,
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
        ...(process.env.NODE_ENV !== "production" && emailResult?.skipped
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
    const created = await tx.users.create({
      data: {
        email,
        password_hash: passwordHash,
        name: name || null,
        is_active: false, // Activated after OTP verification
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

    await tx.signup_email_otps.create({
      data: {
        user_id: created.id,
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
    ...(process.env.NODE_ENV !== "production" && emailResult?.skipped
      ? { devOtp: otpCode }
      : {}),
  }, { status: 201 });
}

