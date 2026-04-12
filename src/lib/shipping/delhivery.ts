import { prisma } from "@/lib/prismaDB";

const DEFAULT_BASE = "https://staging-express.delhivery.com";
const PROD_BASE = "https://track.delhivery.com";

export function isDelhiveryConfigured() {
  return Boolean(
    process.env.DELHIVERY_API_TOKEN?.trim() &&
      process.env.DELHIVERY_CLIENT_NAME?.trim() &&
      process.env.DELHIVERY_PICKUP_LOCATION?.trim() &&
      process.env.DELHIVERY_SELLER_GST_TIN?.trim()
  );
}

/** Unique HSN codes from order line products (order preserved); falls back to DELHIVERY_HSN_CODE env. */
function aggregateHsnForDelhivery(
  items: { products: { hsn_code: string | null } | null }[],
  envFallback: string
): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const raw = it.products?.hsn_code?.trim();
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const norm = part.trim().replace(/[^0-9]/g, "");
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      out.push(norm);
    }
  }
  const fromProducts = out.join(",");
  if (fromProducts) return sanitizeHsnCode(fromProducts, 80);
  return sanitizeHsnCode(envFallback, 80);
}

function delhiveryBaseUrl() {
  const raw = (process.env.DELHIVERY_API_BASE_URL ?? "").trim();
  if (raw) return raw.replace(/\/$/, "");
  const env = (process.env.DELHIVERY_ENV ?? "").trim().toLowerCase();
  if (env === "production" || env === "prod") return PROD_BASE;
  return DEFAULT_BASE;
}

function sanitizeDelhiveryText(s: string, maxLen: number) {
  const cleaned = s
    .replace(/[&\\#%;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLen);
}

/** Delhivery docs: seller_gst_tin + hsn_code are mandatory on order creation. */
function sanitizeSellerGstTin(raw: string): string {
  const u = raw.replace(/\s/g, "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  return u.slice(0, 15);
}

/** Single default HSN or comma-separated list (digits/commas only). */
function sanitizeHsnCode(raw: string, maxLen: number): string {
  const u = raw.replace(/\s/g, "").replace(/[^0-9,]/g, "");
  return u.slice(0, maxLen);
}

/** Ensure JSON fields are scalars — never arrays (Delhivery server expects dict + string fields). */
function coerceDelhiveryString(value: unknown, maxLen: number): string {
  let s: string;
  if (Array.isArray(value)) {
    s = value.length > 0 ? String(value[0]) : "";
  } else if (value == null) {
    s = "";
  } else {
    s = String(value);
  }
  return s.slice(0, maxLen);
}

function normalizeIndiaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) return digits.slice(-10);
  if (digits.length >= 11 && digits.startsWith("0")) return digits.slice(-10);
  if (digits.length >= 10) return digits.slice(-10);
  return digits.slice(0, 10);
}

function orderDateIst(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace("T", " ");
}

function extractWaybill(data: unknown): string | null {
  const seen = new WeakSet<object>();
  const walk = (node: unknown, depth: number): string | null => {
    if (depth > 12 || node == null) return null;
    if (typeof node === "string") return null;
    if (typeof node !== "object") return null;
    if (seen.has(node as object)) return null;
    seen.add(node as object);
    if (Array.isArray(node)) {
      for (const item of node) {
        const w = walk(item, depth + 1);
        if (w) return w;
      }
      return null;
    }
    const o = node as Record<string, unknown>;
    for (const key of ["waybill", "Waybill", "AWB", "awb", "airwaybill_number", "AirwayBill"]) {
      const v = o[key];
      if (typeof v === "string" && /^[A-Za-z0-9]{8,}$/.test(v)) return v;
    }
    for (const v of Object.values(o)) {
      const w = walk(v, depth + 1);
      if (w) return w;
    }
    return null;
  };
  return walk(data, 0);
}

/**
 * CMU `data` body shape (Delhivery’s server is picky):
 * - **Default** `object-root`: `{ "shipments": [ { ...all string fields..., "pickup_location": "WH Name" } ] }`
 *   Avoids bare-array parsing bugs and avoids nested `{ name }` pickup that caused “shipment list contains no data”.
 * - **array**: `[ { ... } ]` only if Delhivery explicitly requires a bare list (`DELHIVERY_CMU_DATA_STYLE=array`).
 * - **wrapped**: `{ "shipments": [ { ..., "pickup_location": { "name": "..." } } ] }` legacy trial (`DELHIVERY_CMU_DATA_STYLE=wrapped`).
 */
type DelhiveryCmuDataStyle = "object-root" | "array" | "wrapped";

function delhiveryCmuDataStyle(): DelhiveryCmuDataStyle {
  const v = (process.env.DELHIVERY_CMU_DATA_STYLE ?? "").trim().toLowerCase();
  if (v === "array" || v === "legacy") return "array";
  if (v === "wrapped") return "wrapped";
  return "object-root";
}

function logDelhiveryPayload(orderId: string, dataValue: unknown) {
  if (process.env.DELHIVERY_DEBUG_PAYLOAD === "1") {
    console.info("[delhivery] create payload (DELHIVERY_DEBUG_PAYLOAD=1)", orderId, JSON.stringify(dataValue));
    return;
  }
  const style = delhiveryCmuDataStyle();
  const keys =
    Array.isArray(dataValue) && dataValue[0] && typeof dataValue[0] === "object"
      ? Object.keys(dataValue[0] as object)
      : typeof dataValue === "object" &&
          dataValue &&
          "shipments" in (dataValue as object) &&
          Array.isArray((dataValue as { shipments: unknown[] }).shipments) &&
          (dataValue as { shipments: unknown[] }).shipments[0] &&
          typeof (dataValue as { shipments: unknown[] }).shipments[0] === "object"
        ? Object.keys((dataValue as { shipments: object[] }).shipments[0])
        : [];
  console.info("[delhivery] create payload summary", { orderId, DELHIVERY_CMU_DATA_STYLE: style, firstShipmentKeys: keys });
}

/**
 * Books a forward shipment with Delhivery after payment succeeds.
 * Safe to call multiple times: no-ops if a waybill already exists or Delhivery is not configured.
 */
export async function bookDelhiveryShipmentForOrder(orderId: string): Promise<void> {
  if (!isDelhiveryConfigured()) return;

  const existing = await prisma.shipments.findUnique({
    where: { order_id: orderId },
    select: { tracking_number: true, metadata: true },
  });
  if (existing?.tracking_number && existing.tracking_number.length > 0) return;
  const meta = (existing?.metadata ?? null) as { delhivery?: { status?: string } } | null;
  if (meta?.delhivery?.status === "booked") return;

  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total_amount: true,
      addresses_orders_shipping_address_idToaddresses: {
        select: {
          full_name: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          postal_code: true,
          country: true,
        },
      },
      order_items: {
        select: {
          product_name: true,
          quantity: true,
          products: { select: { hsn_code: true } },
        },
      },
    },
  });
  const addr = order?.addresses_orders_shipping_address_idToaddresses;
  if (!order || !addr) {
    const row = await prisma.shipments.findUnique({
      where: { order_id: orderId },
      select: { metadata: true },
    });
    const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    await prisma.shipments.updateMany({
      where: { order_id: orderId },
      data: {
        metadata: {
          ...prev,
          delhivery: { status: "skipped", reason: "missing_shipping_address" },
        } as object,
      },
    });
    return;
  }

  const token = process.env.DELHIVERY_API_TOKEN!.trim();
  const client = process.env.DELHIVERY_CLIENT_NAME!.trim();
  const pickup = process.env.DELHIVERY_PICKUP_LOCATION!.trim();
  const sellerGst = sanitizeSellerGstTin(process.env.DELHIVERY_SELLER_GST_TIN ?? "");
  const hsn = aggregateHsnForDelhivery(order.order_items ?? [], process.env.DELHIVERY_HSN_CODE ?? "");
  if (sellerGst.length !== 15) {
    const row = await prisma.shipments.findUnique({
      where: { order_id: orderId },
      select: { metadata: true },
    });
    const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    await prisma.shipments.updateMany({
      where: { order_id: orderId },
      data: {
        metadata: {
          ...prev,
          delhivery: {
            status: "skipped",
            reason: "invalid_seller_gst_env",
            seller_gst_len: sellerGst.length,
          },
        } as object,
      },
    });
    console.warn("[delhivery] invalid DELHIVERY_SELLER_GST_TIN", orderId);
    return;
  }
  if (!hsn) {
    const row = await prisma.shipments.findUnique({
      where: { order_id: orderId },
      select: { metadata: true },
    });
    const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    await prisma.shipments.updateMany({
      where: { order_id: orderId },
      data: {
        metadata: {
          ...prev,
          delhivery: {
            status: "skipped",
            reason: "missing_hsn",
            hint: "Set hsn_code on each product and/or DELHIVERY_HSN_CODE on the server",
          },
        } as object,
      },
    });
    console.warn("[delhivery] no HSN from products or env", orderId);
    return;
  }

  const defaultWeightG = Math.max(
    1,
    Math.min(30_000, Number(process.env.DELHIVERY_DEFAULT_WEIGHT_G ?? "500") || 500)
  );

  const phone = normalizeIndiaPhone(addr.phone ?? "");
  if (phone.length !== 10) {
    const row = await prisma.shipments.findUnique({
      where: { order_id: orderId },
      select: { metadata: true },
    });
    const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    await prisma.shipments.updateMany({
      where: { order_id: orderId },
      data: {
        metadata: {
          ...prev,
          delhivery: { status: "skipped", reason: "invalid_phone", raw_phone: addr.phone ?? "" },
        } as object,
      },
    });
    console.warn("[delhivery] invalid phone, skipping booking", orderId, addr.phone);
    return;
  }
  const addParts = [addr.line1, addr.line2].filter(Boolean).join(", ");
  const add = sanitizeDelhiveryText(coerceDelhiveryString(addParts || addr.line1, 500), 240);
  const name = sanitizeDelhiveryText(coerceDelhiveryString(addr.full_name || "Customer", 200), 100);
  const city = sanitizeDelhiveryText(coerceDelhiveryString(addr.city, 200), 80);
  const state = sanitizeDelhiveryText(coerceDelhiveryString(addr.state, 200), 80);
  const pin = sanitizeDelhiveryText(coerceDelhiveryString(addr.postal_code, 50), 12);
  const country = sanitizeDelhiveryText(coerceDelhiveryString(addr.country || "India", 100), 40);

  const qtyTotal =
    order.order_items?.reduce((s, it) => s + (Number.isFinite(it.quantity) ? it.quantity : 0), 0) || 1;
  const descParts = (order.order_items ?? []).map((it) => {
    const pn = coerceDelhiveryString(it.product_name, 300);
    const q = Number.isFinite(it.quantity) ? it.quantity : 0;
    return `${pn} x${q}`;
  });
  const products_desc = sanitizeDelhiveryText(descParts.join(", ") || "Order items", 199);

  const total = Number(order.total_amount);
  const total_amount = Number.isFinite(total) ? total.toFixed(2) : "0.00";

  const shipmentFlat: Record<string, string> = {
    name,
    order: order.id.replace(/-/g, "").slice(0, 32),
    seller_gst_tin: sellerGst,
    hsn_code: hsn,
    invoice_reference: order.id.replace(/-/g, "").slice(0, 32),
    phone,
    add,
    pin,
    city,
    state,
    country,
    payment_mode: "Prepaid",
    cod_amount: "0",
    order_date: orderDateIst(),
    total_amount,
    seller_name: coerceDelhiveryString(process.env.SITE_NAME ?? "i-Robox", 200).slice(0, 80),
    quantity: String(qtyTotal),
    products_desc,
    weight: String(defaultWeightG),
    pickup_location: pickup,
    client,
    return_pin: "",
    return_city: "",
    return_phone: "",
    return_add: "",
    return_state: "",
    return_country: "",
    seller_add: "",
    seller_inv: "",
    waybill: "",
    shipment_width: "",
    shipment_height: "",
  };

  const style = delhiveryCmuDataStyle();
  const dataValue: unknown =
    style === "array"
      ? [shipmentFlat]
      : style === "wrapped"
        ? { shipments: [{ ...shipmentFlat, pickup_location: { name: pickup } }] }
        : { shipments: [shipmentFlat] };

  logDelhiveryPayload(orderId, dataValue);

  const url = `${delhiveryBaseUrl()}/api/cmu/create.json`;
  const body = new URLSearchParams();
  body.set("format", "json");
  body.set("data", JSON.stringify(dataValue));

  let rawJson: unknown;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body.toString(),
    });
    const text = await res.text();
    try {
      rawJson = JSON.parse(text) as unknown;
    } catch {
      rawJson = { parse_error: true, body: text.slice(0, 2000) };
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err: any) {
    const row = await prisma.shipments.findUnique({
      where: { order_id: orderId },
      select: { metadata: true },
    });
    const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    await prisma.shipments.updateMany({
      where: { order_id: orderId },
      data: {
        metadata: {
          ...prev,
          delhivery: {
            status: "error",
            message: String(err?.message ?? "request_failed"),
            at: new Date().toISOString(),
          },
        } as object,
      },
    });
    console.error("[delhivery] create failed", orderId, err);
    return;
  }

  const waybill = extractWaybill(rawJson);
  const rmk =
    typeof rawJson === "object" && rawJson && "rmk" in rawJson
      ? String((rawJson as Record<string, unknown>).rmk ?? "")
      : "";

  if (!waybill && rmk && !/success/i.test(rmk)) {
    const row = await prisma.shipments.findUnique({
      where: { order_id: orderId },
      select: { metadata: true },
    });
    const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    await prisma.shipments.updateMany({
      where: { order_id: orderId },
      data: {
        metadata: {
          ...prev,
          delhivery: { status: "error", rmk, response: rawJson },
        } as object,
      },
    });
    console.error("[delhivery] no waybill", orderId, rawJson);
    return;
  }

  const row = await prisma.shipments.findUnique({
    where: { order_id: orderId },
    select: { metadata: true },
  });
  const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  await prisma.shipments.updateMany({
    where: { order_id: orderId },
    data: {
      carrier: "Delhivery",
      tracking_number: waybill,
      status: waybill ? "CREATED" : "PENDING",
      metadata: {
        ...prev,
        delhivery: { status: waybill ? "booked" : "pending", response: rawJson },
      } as object,
    },
  });
}
