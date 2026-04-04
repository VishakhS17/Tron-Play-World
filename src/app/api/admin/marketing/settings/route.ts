import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { requireAdminWrite } from "@/lib/admin/rbac";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { cleanOptionalText, cleanText, normalizeCode, readJsonBody } from "@/lib/validation/input";
import { SITE_MARKETING_SETTINGS_ID } from "@/lib/marketing/siteSettingsId";

export async function GET() {
  const auth = await requireAdminWrite();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const row = await prisma.site_marketing_settings.findUnique({
    where: { id: SITE_MARKETING_SETTINGS_ID },
  });
  return NextResponse.json(row ?? { id: SITE_MARKETING_SETTINGS_ID, first_visit_coupon_code: null });
}

export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimitStrict(`admin_marketing_settings:${req.ip ?? "unknown"}`, 1);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await requireAdminWrite();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body as Record<string, unknown>;

  const data: Record<string, string | null> = {};

  if (body.first_visit_coupon_code !== undefined) {
    if (body.first_visit_coupon_code === null || body.first_visit_coupon_code === "") {
      data.first_visit_coupon_code = null;
    } else {
      const c = normalizeCode(String(body.first_visit_coupon_code));
      data.first_visit_coupon_code = c || null;
    }
  }

  if (body.help_support_title !== undefined) {
    data.help_support_title = cleanOptionalText(body.help_support_title, 120);
  }
  if (body.contact_address !== undefined) {
    if (body.contact_address === null || body.contact_address === "") {
      data.contact_address = null;
    } else {
      const t = cleanText(body.contact_address, 5000);
      data.contact_address = t || null;
    }
  }
  if (body.contact_phone !== undefined) {
    data.contact_phone = cleanOptionalText(body.contact_phone, 80);
  }
  if (body.contact_email !== undefined) {
    data.contact_email = cleanOptionalText(body.contact_email, 200);
  }
  if (body.social_facebook_url !== undefined) {
    data.social_facebook_url = cleanOptionalText(body.social_facebook_url, 500);
  }
  if (body.social_twitter_url !== undefined) {
    data.social_twitter_url = cleanOptionalText(body.social_twitter_url, 500);
  }
  if (body.social_instagram_url !== undefined) {
    data.social_instagram_url = cleanOptionalText(body.social_instagram_url, 500);
  }
  if (body.social_linkedin_url !== undefined) {
    data.social_linkedin_url = cleanOptionalText(body.social_linkedin_url, 500);
  }
  if (body.visit_eyebrow !== undefined) {
    data.visit_eyebrow = cleanOptionalText(body.visit_eyebrow, 120);
  }
  if (body.visit_heading !== undefined) {
    data.visit_heading = cleanOptionalText(body.visit_heading, 255);
  }
  if (body.visit_location_label !== undefined) {
    data.visit_location_label = cleanOptionalText(body.visit_location_label, 120);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No recognized fields to update" }, { status: 400 });
  }

  const baseCreate = {
    id: SITE_MARKETING_SETTINGS_ID,
    first_visit_coupon_code: null as string | null,
    help_support_title: null as string | null,
    contact_address: null as string | null,
    contact_phone: null as string | null,
    contact_email: null as string | null,
    social_facebook_url: null as string | null,
    social_twitter_url: null as string | null,
    social_instagram_url: null as string | null,
    social_linkedin_url: null as string | null,
    visit_eyebrow: null as string | null,
    visit_heading: null as string | null,
    visit_location_label: null as string | null,
  };

  const updated = await prisma.site_marketing_settings.upsert({
    where: { id: SITE_MARKETING_SETTINGS_ID },
    create: { ...baseCreate, ...data },
    update: data,
  });

  return NextResponse.json(updated, { status: 200 });
}
