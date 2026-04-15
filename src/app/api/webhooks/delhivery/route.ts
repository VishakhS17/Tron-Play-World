import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaDB";
import { mapDelhiveryStatus } from "@/lib/shipping/delhivery";

function extractWaybillAny(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input === "string" && /^\d{8,}$/.test(input)) return input;
  if (typeof input !== "object") return null;
  if (Array.isArray(input)) {
    for (const it of input) {
      const w = extractWaybillAny(it);
      if (w) return w;
    }
    return null;
  }
  const o = input as Record<string, unknown>;
  for (const k of ["waybill", "awb", "AWB", "airwaybill", "airwaybill_number", "wbn"]) {
    const w = extractWaybillAny(o[k]);
    if (w) return w;
  }
  for (const v of Object.values(o)) {
    const w = extractWaybillAny(v);
    if (w) return w;
  }
  return null;
}

function extractStatusAny(input: unknown): string {
  if (!input || typeof input !== "object") return "CREATED";
  const o = input as Record<string, unknown>;
  const raw =
    String(
      o.status ??
        o.shipment_status ??
        o.current_status ??
        o.scan ??
        o.remark ??
        "CREATED"
    ) || "CREATED";
  return raw;
}

export async function POST(req: NextRequest) {
  const expectedSecret = (process.env.DELHIVERY_WEBHOOK_SECRET ?? "").trim();
  if (expectedSecret) {
    const provided =
      (req.headers.get("x-delhivery-secret") ?? req.headers.get("x-webhook-secret") ?? "").trim();
    if (!provided || provided !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const waybill = extractWaybillAny(body);
  if (!waybill) return NextResponse.json({ error: "Waybill missing" }, { status: 400 });

  const statusRaw = extractStatusAny(body);
  const shipmentStatus = mapDelhiveryStatus(statusRaw);

  const row = await prisma.shipments.findFirst({
    where: { tracking_number: waybill },
    select: { id: true, order_id: true, metadata: true },
  });
  if (!row) return NextResponse.json({ ok: true, matched: false }, { status: 200 });

  const prev = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  await prisma.shipments.update({
    where: { id: row.id },
    data: {
      status: shipmentStatus,
      delivered_at: shipmentStatus === "DELIVERED" ? new Date() : undefined,
      metadata: {
        ...prev,
        delhivery: {
          ...(typeof prev.delhivery === "object" && prev.delhivery ? (prev.delhivery as object) : {}),
          webhook: {
            at: new Date().toISOString(),
            waybill,
            statusRaw,
            mappedStatus: shipmentStatus,
            payload: body,
          },
        },
      } as object,
    },
  });

  return NextResponse.json({ ok: true, matched: true }, { status: 200 });
}

