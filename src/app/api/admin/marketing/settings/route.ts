import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { requireAdminWrite } from "@/lib/admin/rbac";
import { assertSameOrigin } from "@/lib/security/origin";
import { rateLimitStrict } from "@/lib/security/rateLimit";
import { normalizeCode, readJsonBody } from "@/lib/validation/input";
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
  } catch (e: any) {
    if (e?.message === "BAD_ORIGIN") {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await requireAdminWrite();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const body = parsed.body;

  if (body.first_visit_coupon_code === undefined) {
    return NextResponse.json({ error: "first_visit_coupon_code required" }, { status: 400 });
  }

  let first_visit_coupon_code: string | null = null;
  if (body.first_visit_coupon_code === null || body.first_visit_coupon_code === "") {
    first_visit_coupon_code = null;
  } else {
    const c = normalizeCode(String(body.first_visit_coupon_code));
    first_visit_coupon_code = c || null;
  }

  const updated = await prisma.site_marketing_settings.upsert({
    where: { id: SITE_MARKETING_SETTINGS_ID },
    create: {
      id: SITE_MARKETING_SETTINGS_ID,
      first_visit_coupon_code,
    },
    update: { first_visit_coupon_code },
  });

  return NextResponse.json(updated, { status: 200 });
}
