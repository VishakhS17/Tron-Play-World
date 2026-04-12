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

type MinimalDelhiveryShipmentRow = {
  name: string;
  order: string;
  phone: string;
  add: string;
  pin: string;
  city: string;
  state: string;
  country: string;
  payment_mode: string;
  cod_amount: string;
  total_amount: string;
  quantity: string;
  products_desc: string;
  weight: string;
};

function validateDelhiveryShipmentRow(s: MinimalDelhiveryShipmentRow): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!s.name?.trim()) reasons.push("missing_name");
  if (!s.add?.trim()) reasons.push("missing_add");
  if (!/^\d{6}$/.test(s.pin || "")) reasons.push("pin_must_be_6_digits");
  if (!s.city?.trim()) reasons.push("missing_city");
  if (!s.state?.trim()) reasons.push("missing_state");
  if (!/^\d{10}$/.test(s.phone || "")) reasons.push("phone_must_be_10_digits");
  if (!s.order?.trim()) reasons.push("missing_order");
  if (!s.products_desc?.trim()) reasons.push("missing_products_desc");
  const pm = (s.payment_mode || "").trim();
  if (pm !== "Prepaid" && pm !== "COD") reasons.push("payment_mode_must_be_Prepaid_or_COD");
  const total = Number(s.total_amount);
  if (!Number.isFinite(total) || total < 0) reasons.push("invalid_total_amount");
  if (pm === "Prepaid" && s.cod_amount !== "0") reasons.push("cod_amount_must_be_0_for_prepaid");
  const w = Number(s.weight);
  if (!Number.isFinite(w) || w <= 0) reasons.push("weight_must_be_gt_0_g");
  const q = Number(s.quantity);
  if (!Number.isInteger(q) || q < 1) reasons.push("quantity_must_be_int_ge_1");
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/**
 * CMU create: **application/x-www-form-urlencoded** with `format=json` and `data=JSON.stringify(payload)`.
 * Aligns with Delhivery doc sample: **`shipments` first**, **`pickup_location: { name }` last**; row includes optional keys (even `""`) and `weight` in **grams** (string).
 */

/** Deep-freeze parsed JSON so nothing mutates the logged/sent snapshot. */
function deepFreezeDelhiveryPayload(o: unknown): unknown {
  if (o === null || typeof o !== "object") return o;
  Object.freeze(o);
  if (Array.isArray(o)) {
    for (const item of o) deepFreezeDelhiveryPayload(item);
    return o;
  }
  for (const k of Object.keys(o as object)) {
    deepFreezeDelhiveryPayload((o as Record<string, unknown>)[k]);
  }
  return o;
}

function maskDelhiveryTokenForLog(token: string): string {
  const t = token.trim();
  if (t.length <= 6) return "******";
  return `${t.slice(0, 6)}…`;
}

/** Verbose CMU request/response logging when DELHIVERY_DEBUG_PAYLOAD=1 (PII — disable in prod when done). */
function logDelhiveryCmuVerboseRequest(
  orderId: string,
  url: string,
  token: string,
  payload: unknown,
  requestBodyString: string
) {
  if (!delhiveryDebug()) return;
  console.log("HTTP_CLIENT:", "fetch");
  console.log("TYPE OF PAYLOAD:", typeof payload);
  if (Array.isArray(payload)) {
    console.log("SHIPMENTS LENGTH (array root):", payload.length);
  } else if (payload && typeof payload === "object" && "shipments" in (payload as object)) {
    const sh = (payload as { shipments?: unknown }).shipments;
    console.log("SHIPMENTS LENGTH:", Array.isArray(sh) ? sh.length : "n/a");
  } else {
    console.log("SHIPMENTS LENGTH:", "n/a");
  }
  console.log("REQUEST_URL:", url);
  console.log("REQUEST_METHOD:", "POST");
  console.log("REQUEST_HEADERS:", {
    Authorization: `Token ${maskDelhiveryTokenForLog(token)}`,
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  });
  console.log(
    "REQUEST_BODY_TYPE:",
    typeof requestBodyString,
    "(application/x-www-form-urlencoded; literal format=json&data=encodeURIComponent(JSON))"
  );
  console.log("REQUEST_BODY_RAW:", requestBodyString);
  try {
    const params = new URLSearchParams(requestBodyString);
    const dataField = params.get("data");
    console.log("FORM_FORMAT:", params.get("format"));
    console.log(
      "DATA_FIELD_IS_JSON_STRING:",
      typeof dataField,
      dataField ? `(length ${dataField.length}, first char ${JSON.stringify(dataField[0])})` : ""
    );
    if (dataField) {
      console.log("DATA_FIELD_JSON_PARSE_CHECK:", JSON.stringify(JSON.parse(dataField), null, 2));
    }
  } catch (e) {
    console.log("DATA_FIELD_JSON_PARSE_CHECK_FAILED:", String(e));
  }
  console.log("[delhivery] verbose request end", orderId);
}

function logDelhiveryCmuVerboseResponse(orderId: string, res: Response, responseText: string) {
  if (!delhiveryDebug()) return;
  let headersObj: Record<string, string> = {};
  try {
    headersObj = Object.fromEntries(res.headers.entries());
  } catch {
    headersObj = {};
  }
  console.log("DELHIVERY_RESPONSE_STATUS:", res.status);
  console.log("DELHIVERY_RESPONSE_HEADERS:", headersObj);
  console.log("DELHIVERY_RESPONSE_BODY_RAW:", responseText);
  console.log("[delhivery] verbose response end", orderId);
}

function logDelhiveryPayloadSummary(orderId: string, dataValue: unknown) {
  if (delhiveryDebug()) return;
  const keys =
    typeof dataValue === "object" &&
    dataValue &&
    "shipments" in (dataValue as object) &&
    Array.isArray((dataValue as { shipments: unknown[] }).shipments) &&
    (dataValue as { shipments: unknown[] }).shipments[0] &&
    typeof (dataValue as { shipments: unknown[] }).shipments[0] === "object"
      ? Object.keys((dataValue as { shipments: object[] }).shipments[0])
      : [];
  console.info("[delhivery] create payload summary", { orderId, firstShipmentKeys: keys });
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
  const pickup = process.env.DELHIVERY_PICKUP_LOCATION!.trim();
  const client = process.env.DELHIVERY_CLIENT_NAME!.trim();

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

  const orderRef = order.id.replace(/-/g, "").slice(0, 32);
  const weightGramsStr = String(defaultWeightG);

  const shipmentRow: Record<string, unknown> = {
    client,
    name,
    add,
    pin: pin6,
    city,
    state,
    country,
    phone,
    order: orderRef,
    payment_mode: "Prepaid",
    return_pin: "",
    return_city: "",
    return_phone: "",
    return_add: "",
    return_state: "",
    return_country: "",
    products_desc,
    hsn_code: "",
    cod_amount: "0",
    order_date: null,
    total_amount,
    seller_add: "",
    seller_name: sanitizeDelhiveryText(coerceDelhiveryString(process.env.SITE_NAME ?? "Store", 200), 80),
    seller_inv: "",
    quantity: String(qtyTotal),
    waybill: "",
    shipment_width: "",
    shipment_height: "",
    weight: weightGramsStr,
    shipping_mode: "Surface",
    address_type: "",
  };

  const dataValue = {
    shipments: [shipmentRow],
    pickup_location: { name: pickup },
  };

  const minimalCheck: MinimalDelhiveryShipmentRow = {
    name,
    order: orderRef,
    phone,
    add,
    pin: pin6,
    city,
    state,
    country,
    payment_mode: "Prepaid",
    cod_amount: "0",
    total_amount,
    quantity: String(qtyTotal),
    products_desc,
    weight: weightGramsStr,
  };

  const validation = validateDelhiveryShipmentRow(minimalCheck);
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

  logDelhiveryPayloadSummary(orderId, dataValue);

  const url = `${delhiveryBaseUrl()}/api/cmu/create.json`;
  let payloadForSend: unknown = dataValue;
  if (delhiveryDebug()) {
    payloadForSend = deepFreezeDelhiveryPayload(JSON.parse(JSON.stringify(dataValue)));
  }
  // `format` is a top-level form field only — never inside the JSON `payload` (pickup_location + shipments).
  // Build wire body explicitly: some stacks mishandle `Accept: application/json` with form bodies or URLSearchParams edge cases.
  const payload = payloadForSend;
  const dataJson = JSON.stringify(payload);
  const formBodyStr = `format=json&data=${encodeURIComponent(dataJson)}`;
  console.log("FINAL JSON BODY:", JSON.stringify(payload, null, 2));
  logDelhiveryCmuVerboseRequest(orderId, url, token, payload, formBodyStr);

  let rawJson: unknown = null;
  let responseText = "";
  let lastResponse: Response | null = null;
  try {
    lastResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Authorization: `Token ${token}`,
      },
      body: formBodyStr,
    });
    responseText = await lastResponse.text();
    logDelhiveryCmuVerboseResponse(orderId, lastResponse, responseText);
    if (delhiveryDebug()) {
      try {
        console.log("DELHIVERY_RESPONSE_BODY_PARSED:", JSON.stringify(JSON.parse(responseText), null, 2));
      } catch {
        console.log("DELHIVERY_RESPONSE_BODY_PARSED: (not JSON)");
      }
    }
    try {
      rawJson = JSON.parse(responseText) as unknown;
    } catch {
      rawJson = { parse_error: true, body: responseText.slice(0, 8000) };
    }
    if (!lastResponse.ok) {
      throw new Error(`HTTP ${lastResponse.status}`);
    }
  } catch (err: any) {
    if (delhiveryDebug()) {
      console.log("DELHIVERY_FETCH_ERROR:", String(err?.message ?? err));
      if (lastResponse) {
        console.log("DELHIVERY_RESPONSE_STATUS (error path):", lastResponse.status);
      }
    }
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
              ? {
                  responseTextPreview: responseText.slice(0, 4000),
                  parsedResponse: rawJson ?? null,
                  httpStatus: lastResponse?.status ?? null,
                }
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
