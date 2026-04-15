import { prisma } from "@/lib/prismaDB";

const DEFAULT_BASE = "https://staging-express.delhivery.com";
const PROD_BASE = "https://track.delhivery.com";
const SERVICEABILITY_TTL_MS = 5 * 60 * 1000;
const serviceabilityCache = new Map<string, { expiresAt: number; value: unknown }>();
const breakerState = { failures: 0, openUntil: 0 };

type DelhiveryOrderMode = "Prepaid" | "COD" | "Pickup" | "REPL";
type StrictShipmentRow = {
  client: string;
  name: string;
  add: string;
  pin: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  order: string;
  payment_mode: DelhiveryOrderMode;
  cod_amount: string;
  products_desc: string;
  total_amount: string;
  quantity: string;
  weight: string;
  shipping_mode: "Surface" | "Express";
  hsn_code: string;
  order_date: null;
  seller_name: string;
  seller_add: string;
  seller_inv: string;
  return_pin: string;
  return_city: string;
  return_phone: string;
  return_add: string;
  return_state: string;
  return_country: string;
  waybill: string;
  shipment_width: string;
  shipment_height: string;
  address_type: string;
  seller_gst_tin?: string;
};

type StrictCmuPayload = {
  shipments: StrictShipmentRow[];
  pickup_location: { name: string };
};
type CmuPayloadVariant =
  | StrictCmuPayload
  | { shipments: Array<Record<string, unknown>>; pickup_location: string };

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

function delhiveryEnabled(): boolean {
  return process.env.DELHIVERY_ENABLED !== "0";
}

function delhiveryAutoPickupEnabled(): boolean {
  return process.env.DELHIVERY_AUTO_PICKUP === "1";
}

function delhiveryMaxRetries(): number {
  const n = Number(process.env.DELHIVERY_MAX_RETRIES ?? "2");
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(5, Math.trunc(n)));
}

function logDelhiveryEvent(orderId: string, event: string, details: Record<string, unknown>) {
  const safe: Record<string, unknown> = {
    orderId,
    event,
    at: new Date().toISOString(),
    ...details,
  };
  console.info("[delhivery]", JSON.stringify(safe));
}

function delhiveryBaseUrl() {
  const raw = (process.env.DELHIVERY_API_BASE_URL ?? "").trim();
  if (raw) return raw.replace(/\/$/, "");
  const env = (process.env.DELHIVERY_ENV ?? "").trim().toLowerCase();
  if (env === "production" || env === "prod") return PROD_BASE;
  return DEFAULT_BASE;
}

function validateDelhiveryConfigAtRuntime(orderId: string): { ok: true } | { ok: false; reason: string } {
  if (!delhiveryEnabled()) return { ok: false, reason: "disabled_by_flag" };
  const base = delhiveryBaseUrl();
  const token = (process.env.DELHIVERY_API_TOKEN ?? "").trim();
  const pickup = (process.env.DELHIVERY_PICKUP_LOCATION ?? "").trim();
  if (!token) return { ok: false, reason: "missing_token" };
  if (!pickup) return { ok: false, reason: "missing_pickup_location" };
  if (!/^https?:\/\//i.test(base)) return { ok: false, reason: "invalid_base_url" };
  const env = (process.env.DELHIVERY_ENV ?? "").trim().toLowerCase();
  const baseLooksProd = /track\.delhivery\.com/i.test(base);
  const baseLooksStaging = /staging-express\.delhivery\.com/i.test(base);
  if (env === "production" && baseLooksStaging) {
    logDelhiveryEvent(orderId, "config_warning", { reason: "env_prod_with_staging_base", base });
  }
  if ((env === "staging" || env === "test") && baseLooksProd) {
    logDelhiveryEvent(orderId, "config_warning", { reason: "env_staging_with_prod_base", base });
  }
  return { ok: true };
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

export function mapDelhiveryStatus(raw: string): "CREATED" | "IN_TRANSIT" | "DELIVERED" | "DELAYED" | "RETURNED" {
  const s = raw.toUpperCase();
  if (/(DELIVERED|DLVD|COMPLETED)/.test(s)) return "DELIVERED";
  if (/(IN TRANSIT|IN_TRANSIT|DISPATCHED|OFD)/.test(s)) return "IN_TRANSIT";
  if (/(RTO|RTS|RETURN|NDR RETURNED)/.test(s)) return "RETURNED";
  if (/(DELAY|HOLD|PENDING)/.test(s)) return "DELAYED";
  return "CREATED";
}

function circuitOpen(): boolean {
  return Date.now() < breakerState.openUntil;
}

function recordFailure() {
  breakerState.failures += 1;
  if (breakerState.failures >= 5) {
    breakerState.openUntil = Date.now() + 3 * 60 * 1000;
  }
}

function recordSuccess() {
  breakerState.failures = 0;
  breakerState.openUntil = 0;
}

function classifyTransient(status: number | null, errMsg: string): boolean {
  if (status !== null && (status === 429 || status >= 500)) return true;
  return /(timeout|timed out|network|socket|econnreset|fetch failed|temporar)/i.test(errMsg);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkServiceability(
  token: string,
  pin6: string
): Promise<{ serviceable: boolean; codAllowed: boolean | null; raw: unknown }> {
  const now = Date.now();
  const cached = serviceabilityCache.get(pin6);
  if (cached && cached.expiresAt > now) {
    const data = cached.value as any;
    return {
      serviceable: Boolean(data?.serviceable),
      codAllowed: typeof data?.codAllowed === "boolean" ? data.codAllowed : null,
      raw: data?.raw ?? null,
    };
  }
  const url = `${delhiveryBaseUrl()}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pin6)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Token ${token}`,
    },
  });
  const txt = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(txt);
  } catch {
    parsed = txt;
  }
  let serviceable = false;
  let codAllowed: boolean | null = null;
  if (Array.isArray(parsed)) {
    serviceable = parsed.length > 0;
    const first = parsed[0] as Record<string, unknown> | undefined;
    const p = String(first?.payment_type ?? first?.payment_types ?? "").toUpperCase();
    if (p) codAllowed = /(COD|BOTH|CASH)/.test(p);
  } else if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.delivery_codes)) {
      const arr = o.delivery_codes as unknown[];
      serviceable = arr.length > 0;
      const first = arr[0] as Record<string, unknown> | undefined;
      const p = String(first?.postal_code?.payment_types ?? first?.postal_code?.pre_paid ?? "").toUpperCase();
      if (p) codAllowed = /(COD|BOTH|Y|YES)/.test(p);
    } else {
      serviceable = Object.keys(o).length > 0;
    }
  }
  const cacheVal = { serviceable, codAllowed, raw: parsed };
  serviceabilityCache.set(pin6, { expiresAt: now + SERVICEABILITY_TTL_MS, value: cacheVal });
  return cacheVal;
}

async function verifyWarehousePreflight(
  token: string,
  pickupName: string
): Promise<{ checked: boolean; ok: boolean; details?: unknown }> {
  const raw = (process.env.DELHIVERY_CLIENT_WAREHOUSE_LOOKUP_URL ?? "").trim();
  if (!raw) {
    return { checked: false, ok: true };
  }
  // Optional account-specific lookup endpoint. Example:
  // DELHIVERY_CLIENT_WAREHOUSE_LOOKUP_URL=https://staging-express.delhivery.com/api/backend/clientwarehouse/list/
  // We append `?name=<pickup>` if no query exists, else `&name=<pickup>`.
  const sep = raw.includes("?") ? "&" : "?";
  const url = `${raw}${sep}name=${encodeURIComponent(pickupName)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Token ${token}` },
  });
  const txt = await res.text();
  let parsed: unknown = txt;
  try {
    parsed = JSON.parse(txt);
  } catch {
    // keep raw text
  }
  const textHay = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
  const hasName = textHay.toLowerCase().includes(pickupName.toLowerCase());
  return { checked: true, ok: res.ok && hasName, details: parsed };
}

function buildStrictCmuPayload(args: {
  orderRef: string;
  client: string;
  pickup: string;
  name: string;
  add: string;
  pin6: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  products_desc: string;
  total_amount: string;
  qtyTotal: number;
  defaultWeightG: number;
}): StrictCmuPayload {
  const sellerGstTin = (process.env.DELHIVERY_SELLER_GST_TIN ?? "")
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 15);
  const row: StrictShipmentRow = {
    client: args.client,
    name: args.name,
    add: args.add,
    pin: args.pin6,
    city: args.city,
    state: args.state,
    country: args.country,
    phone: args.phone,
    order: args.orderRef,
    payment_mode: "Prepaid",
    return_pin: "",
    return_city: "",
    return_phone: "",
    return_add: "",
    return_state: "",
    return_country: "",
    products_desc: args.products_desc,
    hsn_code: (process.env.DELHIVERY_HSN_CODE ?? "").replace(/\s/g, "").replace(/[^0-9,]/g, "").slice(0, 80),
    cod_amount: "0",
    order_date: null,
    total_amount: args.total_amount,
    seller_add: "",
    seller_name: sanitizeDelhiveryText(coerceDelhiveryString(process.env.SITE_NAME ?? "Store", 200), 80),
    seller_inv: "",
    quantity: String(args.qtyTotal),
    waybill: "",
    shipment_width: "",
    shipment_height: "",
    weight: String(args.defaultWeightG),
    shipping_mode: "Surface",
    address_type: "",
    ...(sellerGstTin.length === 15 ? { seller_gst_tin: sellerGstTin } : {}),
  };
  return {
    shipments: [row],
    pickup_location: { name: args.pickup },
  };
}

async function maybeCreatePickupRequest(orderId: string, token: string, pickup: string): Promise<void> {
  if (!delhiveryAutoPickupEnabled()) return;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = process.env.DELHIVERY_AUTO_PICKUP_TIME ?? "17:00:00";
  const expected = Number(process.env.DELHIVERY_AUTO_PICKUP_PACKAGE_COUNT ?? "1");
  const payload = {
    pickup_time: time,
    pickup_date: date,
    pickup_location: pickup,
    expected_package_count: Number.isFinite(expected) && expected > 0 ? Math.trunc(expected) : 1,
  };
  const res = await fetch(`${delhiveryBaseUrl()}/fm/request/new/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const txt = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(txt);
  } catch {
    parsed = txt;
  }
  const row = await prisma.shipments.findUnique({ where: { order_id: orderId }, select: { metadata: true } });
  const prev = (row?.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  await prisma.shipments.updateMany({
    where: { order_id: orderId },
    data: {
      metadata: {
        ...prev,
        delhivery: {
          ...(typeof prev.delhivery === "object" && prev.delhivery ? (prev.delhivery as object) : {}),
          pickupRequest: { payload, ok: res.ok, response: parsed },
        },
      } as object,
    },
  });
}

async function fetchSingleWaybill(token: string): Promise<string | null> {
  const url = `${delhiveryBaseUrl()}/waybill/api/json/?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "GET" });
  const txt = await res.text();
  try {
    const parsed = JSON.parse(txt);
    return extractWaybill(parsed);
  } catch {
    return extractWaybill(txt);
  }
}

/**
 * Books a forward shipment with Delhivery after payment succeeds.
 * Safe to call multiple times: no-ops if a waybill already exists or Delhivery is not configured.
 */
export async function bookDelhiveryShipmentForOrder(orderId: string): Promise<void> {
  const cfg = validateDelhiveryConfigAtRuntime(orderId);
  if (!cfg.ok) {
    logDelhiveryEvent(orderId, "skip", { reason: cfg.reason });
    return;
  }
  if (!isDelhiveryConfigured()) return;
  if (circuitOpen()) {
    logDelhiveryEvent(orderId, "circuit_open_skip", { openUntil: breakerState.openUntil });
    return;
  }

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
  const client = process.env.DELHIVERY_CLIENT_NAME!.trim();
  const pickup = process.env.DELHIVERY_PICKUP_LOCATION!.trim();

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
  const dataValue = buildStrictCmuPayload({
    orderRef,
    client,
    pickup,
    name,
    add,
    pin6,
    city,
    state,
    country,
    phone,
    products_desc,
    total_amount,
    qtyTotal,
    defaultWeightG,
  });

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

  // Pincode guardrail before create call.
  try {
    const svc = await checkServiceability(token, pin6);
    logDelhiveryEvent(orderId, "serviceability_check", {
      pin: pin6,
      serviceable: svc.serviceable,
      codAllowed: svc.codAllowed,
    });
    if (!svc.serviceable) {
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
              reason: "destination_pin_not_serviceable",
              pin: pin6,
              serviceability: svc.raw,
            },
          } as object,
        },
      });
      return;
    }
  } catch (e) {
    logDelhiveryEvent(orderId, "serviceability_warning", { error: String((e as Error)?.message ?? e) });
  }

  // Optional preflight warehouse lookup (disabled unless DELHIVERY_CLIENT_WAREHOUSE_LOOKUP_URL is set).
  try {
    const preflight = await verifyWarehousePreflight(token, pickup);
    if (preflight.checked) {
      logDelhiveryEvent(orderId, "warehouse_preflight", {
        pickup,
        ok: preflight.ok,
      });
      if (!preflight.ok) {
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
                reason: "warehouse_preflight_failed",
                message:
                  `Preflight could not verify pickup_location '${pickup}'. ` +
                  "Check DELHIVERY_PICKUP_LOCATION exact case/spacing and token-account warehouse mapping.",
                warehousePreflight: preflight.details ?? null,
              },
            } as object,
          },
        });
        return;
      }
    }
  } catch (e) {
    logDelhiveryEvent(orderId, "warehouse_preflight_warning", {
      error: String((e as Error)?.message ?? e),
    });
  }

  logDelhiveryPayloadSummary(orderId, dataValue);

  const url = `${delhiveryBaseUrl()}/api/cmu/create.json`;
  let rawJson: unknown = null;
  let responseText = "";
  let lastResponse: Response | null = null;

  async function postCmuPayload(payloadInput: CmuPayloadVariant, label: string) {
    const payload = delhiveryDebug()
      ? (deepFreezeDelhiveryPayload(JSON.parse(JSON.stringify(payloadInput))) as unknown)
      : (payloadInput as unknown);
    const dataJson = JSON.stringify(payload);
    const formBodyStr = `format=json&data=${encodeURIComponent(dataJson)}`;
    console.log(`FINAL JSON BODY (${label}):`, JSON.stringify(payload, null, 2));
    logDelhiveryCmuVerboseRequest(orderId, url, token, payload, formBodyStr);
    const retries = delhiveryMaxRetries();
    for (let attempt = 0; ; attempt += 1) {
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
        try {
          rawJson = JSON.parse(responseText) as unknown;
        } catch {
          rawJson = { parse_error: true, body: responseText.slice(0, 8000) };
        }
        if (!lastResponse.ok && classifyTransient(lastResponse.status, `HTTP ${lastResponse.status}`) && attempt < retries) {
          logDelhiveryEvent(orderId, "retry", { attempt, status: lastResponse.status });
          await sleep(300 * (attempt + 1));
          continue;
        }
        if (!lastResponse.ok) throw new Error(`HTTP ${lastResponse.status}`);
        return;
      } catch (innerErr: any) {
        const msg = String(innerErr?.message ?? innerErr);
        const status = lastResponse?.status ?? null;
        if (attempt < retries && classifyTransient(status, msg)) {
          logDelhiveryEvent(orderId, "retry", { attempt, status, message: msg });
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw innerErr;
      }
    }
  }

  try {
    await postCmuPayload(dataValue, "primary");
    const primaryRmk =
      typeof rawJson === "object" && rawJson && "rmk" in rawJson
        ? String((rawJson as Record<string, unknown>).rmk ?? "")
        : "";
    const needsWarehouseFallback = /ClientWarehouse matching query does not exist/i.test(primaryRmk);
    if (needsWarehouseFallback) {
      logDelhiveryEvent(orderId, "warehouse_fallback_retry", { reason: primaryRmk });
      const noClientShipments = dataValue.shipments.map((s) => {
        const c = { ...s };
        delete (c as Record<string, unknown>).client;
        return c as Record<string, unknown>;
      });
      const variants: CmuPayloadVariant[] = [
        { shipments: noClientShipments, pickup_location: { name: pickup } },
        { shipments: dataValue.shipments as Array<Record<string, unknown>>, pickup_location: pickup },
        { shipments: noClientShipments, pickup_location: pickup },
      ];
      for (let i = 0; i < variants.length; i += 1) {
        await postCmuPayload(variants[i], `warehouse-fallback-${i + 1}`);
        const retryRmk =
          typeof rawJson === "object" && rawJson && "rmk" in rawJson
            ? String((rawJson as Record<string, unknown>).rmk ?? "")
            : "";
        if (!/ClientWarehouse matching query does not exist/i.test(retryRmk)) break;
      }
    }
    if (delhiveryDebug()) {
      try {
        console.log("DELHIVERY_RESPONSE_BODY_PARSED:", JSON.stringify(JSON.parse(responseText), null, 2));
      } catch {
        console.log("DELHIVERY_RESPONSE_BODY_PARSED: (not JSON)");
      }
    }
  } catch (err: any) {
    recordFailure();
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
            responseTextPreview: responseText.slice(0, 8000),
            parsedResponse: rawJson ?? null,
            httpStatus: lastResponse?.status ?? null,
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
  const warehouseLookupFailure = /ClientWarehouse matching query does not exist/i.test(rmk);

  const looksSuccess =
    typeof rawJson === "object" &&
    rawJson !== null &&
    ((rawJson as Record<string, unknown>).success === true || /success/i.test(rmk));
  const recoveredWaybill = !waybill && looksSuccess ? await fetchSingleWaybill(token) : null;
  const finalWaybill = waybill ?? recoveredWaybill;

  if (!finalWaybill && rmk && !/success/i.test(rmk)) {
    recordFailure();
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
            rmk,
            response: rawJson,
            responseTextPreview: responseText.slice(0, 8000),
            httpStatus: lastResponse?.status ?? null,
            ...(warehouseLookupFailure
              ? {
                  reason: "warehouse_not_mapped_to_token",
                  message:
                    `Delhivery could not find warehouse '${pickup}' for this token/client. ` +
                    "Verify DELHIVERY_PICKUP_LOCATION exact case/spacing and ensure the warehouse is mapped to the same API token account.",
                }
              : {}),
          },
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
      tracking_number: finalWaybill,
      status: finalWaybill ? "CREATED" : "PENDING",
      metadata: {
        ...prev,
        delhivery: {
          status: finalWaybill ? "booked" : "pending",
          response: rawJson,
          rmk,
          responseTextPreview: responseText.slice(0, 8000),
          httpStatus: lastResponse?.status ?? null,
          request: { url, bodyPreview: formBodyStr.slice(0, 500) },
          diagnostics: {
            lastRequestAt: new Date().toISOString(),
            payloadSummaryKeys: Object.keys(dataValue.shipments[0] ?? {}),
          },
        },
      } as object,
    },
  });
  recordSuccess();
  await maybeCreatePickupRequest(orderId, token, pickup).catch((e) =>
    logDelhiveryEvent(orderId, "pickup_request_error", { error: String((e as Error)?.message ?? e) })
  );
  if (delhiveryDebug()) {
    console.info("[delhivery] booked OK (DELHIVERY_DEBUG_PAYLOAD=1)", orderId, JSON.stringify(rawJson));
  }
}
