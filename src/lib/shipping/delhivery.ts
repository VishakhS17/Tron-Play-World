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

function delhiveryDebug(): boolean {
  return process.env.DELHIVERY_DEBUG_PAYLOAD === "1";
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

/** Ensure JSON fields are scalars — never arrays. */
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

/** India PIN: exactly 6 digits (digits only). */
function normalizeIndiaPin6(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length < 6) return null;
  const six = d.length === 6 ? d : d.slice(-6);
  return /^\d{6}$/.test(six) ? six : null;
}

/** Delhivery `weight` as kg decimal string (e.g. 500 g → `"0.5"`). `DELHIVERY_DEFAULT_WEIGHT_G` stays in grams. */
function weightGramsToDelhiveryKgString(grams: number): string {
  const g = Math.max(1, Math.min(30_000, grams));
  const kg = g / 1000;
  const s = kg.toFixed(4).replace(/\.?0+$/, "");
  return s === "" ? "0.001" : s;
}

/** Prefer full state names for common abbreviations (e.g. KA → Karnataka). */
function expandIndianStateForDelhivery(raw: string, maxLen: number): string {
  const cleaned = sanitizeDelhiveryText(coerceDelhiveryString(raw, 200), maxLen);
  const u = cleaned.replace(/\s+/g, " ").trim().toUpperCase();
  const abbr: Record<string, string> = {
    KA: "Karnataka",
    KL: "Kerala",
    TN: "Tamil Nadu",
    MH: "Maharashtra",
    DL: "Delhi",
    TG: "Telangana",
    TS: "Telangana",
    AP: "Andhra Pradesh",
    GJ: "Gujarat",
    RJ: "Rajasthan",
    UP: "Uttar Pradesh",
    WB: "West Bengal",
    HR: "Haryana",
    PB: "Punjab",
  };
  if (u.length <= 3 && abbr[u]) return abbr[u];
  return cleaned;
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

type DelhiveryShipmentRow = Record<string, string>;

function validateDelhiveryShipmentRow(s: DelhiveryShipmentRow): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!s.name?.trim()) reasons.push("missing_name");
  if (!s.add?.trim()) reasons.push("missing_add");
  if (!/^\d{6}$/.test(s.pin || "")) reasons.push("pin_must_be_6_digits");
  if (!s.city?.trim()) reasons.push("missing_city");
  if (!s.state?.trim()) reasons.push("missing_state");
  if (!/^\d{10}$/.test(s.phone || "")) reasons.push("phone_must_be_10_digits");
  if (!s.order?.trim()) reasons.push("missing_order");
  const pm = (s.payment_mode || "").trim();
  if (pm !== "Prepaid" && pm !== "COD") reasons.push("payment_mode_must_be_Prepaid_or_COD");
  const total = Number(s.total_amount);
  if (!Number.isFinite(total) || total < 0) reasons.push("invalid_total_amount");
  if (pm === "Prepaid" && s.cod_amount !== "0") reasons.push("cod_amount_must_be_0_for_prepaid");
  const w = Number(s.weight);
  if (!Number.isFinite(w) || w <= 0) reasons.push("weight_must_be_gt_0");
  const q = Number(s.quantity);
  if (!Number.isInteger(q) || q < 1) reasons.push("quantity_must_be_int_ge_1");
  if (!s.client?.trim()) reasons.push("missing_client");
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/**
 * CMU `data` must be a JSON **object** (never a bare list) for the default path:
 * `{ "pickup_location": "<exact warehouse name>", "shipments": [ { ... } ] }`
 * Each shipment row omits `pickup_location` when root key is set (Delhivery “shipment list contains no data” fix).
 *
 * `DELHIVERY_CMU_DATA_STYLE=array` → legacy `[ { ..., pickup_location: "..." } ]` (bare array).
 * `DELHIVERY_CMU_DATA_STYLE=wrapped` → `{ shipments: [{ ..., pickup_location: { name } }] }` (no root pickup).
 */
type DelhiveryCmuDataStyle = "object-root" | "array" | "wrapped";

function delhiveryCmuDataStyle(): DelhiveryCmuDataStyle {
  const v = (process.env.DELHIVERY_CMU_DATA_STYLE ?? "").trim().toLowerCase();
  if (v === "array" || v === "legacy") return "array";
  if (v === "wrapped") return "wrapped";
  return "object-root";
}

function logDelhiveryDebug(orderId: string, label: string, payload: unknown) {
  if (!delhiveryDebug()) return;
  try {
    console.info(`[delhivery] ${label}`, orderId, typeof payload === "string" ? payload : JSON.stringify(payload));
  } catch {
    console.info(`[delhivery] ${label}`, orderId, String(payload));
  }
}

function logDelhiveryPayloadSummary(orderId: string, dataValue: unknown) {
  if (delhiveryDebug()) return;
  const style = delhiveryCmuDataStyle();
  const keys =
    typeof dataValue === "object" &&
    dataValue &&
    "shipments" in (dataValue as object) &&
    Array.isArray((dataValue as { shipments: unknown[] }).shipments) &&
    (dataValue as { shipments: unknown[] }).shipments[0] &&
    typeof (dataValue as { shipments: unknown[] }).shipments[0] === "object"
      ? Object.keys((dataValue as { shipments: object[] }).shipments[0])
      : Array.isArray(dataValue) && dataValue[0] && typeof dataValue[0] === "object"
        ? Object.keys(dataValue[0] as object)
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

  const pin6 = normalizeIndiaPin6(coerceDelhiveryString(addr.postal_code, 20));
  if (!pin6) {
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
          delhivery: { status: "skipped", reason: "invalid_pin", raw_postal_code: addr.postal_code ?? "" },
        } as object,
      },
    });
    console.warn("[delhivery] invalid India PIN (need 6 digits)", orderId, addr.postal_code);
    return;
  }

  const addParts = [addr.line1, addr.line2].filter(Boolean).join(", ");
  const add = sanitizeDelhiveryText(coerceDelhiveryString(addParts || addr.line1, 500), 240);
  const name = sanitizeDelhiveryText(coerceDelhiveryString(addr.full_name || "Customer", 200), 100);
  const city = sanitizeDelhiveryText(coerceDelhiveryString(addr.city, 200), 80);
  const state = expandIndianStateForDelhivery(addr.state ?? "", 80);
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

  const shipmentFlat: DelhiveryShipmentRow = {
    name,
    order: order.id.replace(/-/g, "").slice(0, 32),
    seller_gst_tin: sellerGst,
    hsn_code: hsn,
    invoice_reference: order.id.replace(/-/g, "").slice(0, 32),
    phone,
    add,
    pin: pin6,
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
    weight: weightGramsToDelhiveryKgString(defaultWeightG),
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

  const { pickup_location: _rowPickup, ...shipmentWithoutPickup } = shipmentFlat;

  const style = delhiveryCmuDataStyle();
  let dataValue: unknown;
  if (style === "array") {
    dataValue = [shipmentFlat];
  } else if (style === "wrapped") {
    dataValue = {
      shipments: [{ ...shipmentWithoutPickup, pickup_location: { name: pickup } }],
    };
  } else {
    dataValue = {
      pickup_location: pickup,
      shipments: [shipmentWithoutPickup],
    };
  }

  const shipmentsArr =
    typeof dataValue === "object" &&
    dataValue !== null &&
    "shipments" in dataValue &&
    Array.isArray((dataValue as { shipments: unknown }).shipments)
      ? (dataValue as { shipments: DelhiveryShipmentRow[] }).shipments
      : Array.isArray(dataValue)
        ? (dataValue as DelhiveryShipmentRow[])
        : [];

  if (shipmentsArr.length === 0) {
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
          delhivery: { status: "skipped", reason: "empty_shipments_array", cmuStyle: style },
        } as object,
      },
    });
    console.error("[delhivery] empty shipments", orderId, style);
    return;
  }

  const validation = validateDelhiveryShipmentRow(shipmentFlat);
  if (!validation.ok) {
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
            reason: "delhivery_shipment_validation_failed",
            reasons: validation.reasons,
          },
        } as object,
      },
    });
    console.warn("[delhivery] shipment validation failed", orderId, validation.reasons);
    return;
  }

  logDelhiveryDebug(orderId, "create request payload (DELHIVERY_DEBUG_PAYLOAD=1)", dataValue);
  logDelhiveryPayloadSummary(orderId, dataValue);

  const url = `${delhiveryBaseUrl()}/api/cmu/create.json`;
  const body = new URLSearchParams();
  body.set("format", "json");
  body.set("data", JSON.stringify(dataValue));

  let rawJson: unknown = null;
  let responseText = "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body.toString(),
    });
    responseText = await res.text();
    try {
      rawJson = JSON.parse(responseText) as unknown;
    } catch {
      rawJson = { parse_error: true, body: responseText.slice(0, 8000) };
    }
    logDelhiveryDebug(orderId, "create API raw response text (DELHIVERY_DEBUG_PAYLOAD=1)", responseText.slice(0, 12000));
    logDelhiveryDebug(orderId, "create API parsed JSON (DELHIVERY_DEBUG_PAYLOAD=1)", rawJson);
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
            ...(delhiveryDebug()
              ? { responseTextPreview: responseText.slice(0, 4000), parsedResponse: rawJson ?? null }
              : {}),
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
    if (delhiveryDebug()) {
      console.info("[delhivery] no waybill — full response (DELHIVERY_DEBUG_PAYLOAD=1)", orderId, responseText.slice(0, 12000));
    }
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
  if (delhiveryDebug()) {
    console.info("[delhivery] booked OK (DELHIVERY_DEBUG_PAYLOAD=1)", orderId, JSON.stringify(rawJson));
  }
}
