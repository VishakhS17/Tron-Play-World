# Remaining feature backlog (vs. spec)

This list tracks work **not yet done** or only **partially** done compared to the agreed e-commerce feature spec.

**Deferred on purpose (handle later):**

- Payment gateway integration (UPI, cards, netbanking, webhooks, server-side verification).
- Shipment tracking / carrier API sync and related automation.

---

## Checkout & accounts

1. **Account-only checkout** — Require a logged-in customer before checkout completes; remove or gate the path that auto-creates a `customers` row from the checkout email (“guest-ish” flow today).
2. **Checkout UX** — Send unauthenticated users to login/signup with a return URL to checkout.

---

## Tax & shipping (non-gateway)

3. **Configurable GST** — Replace hardcoded `tax_amount: 0` with configurable rules (rate, inclusive/exclusive, display on checkout and invoice).
4. **Shipping calculation** — Beyond flat ₹99 / free over ₹2000: **location-based** and/or **weight-based** rules (data model, checkout totals, invoice).

---

## Merchandising & CMS

**Implemented (Mar 2026):** Admin **Marketing** (`/admin/marketing`) + Prisma tables for hero slides, homepage highlights (featured/trending/category/product/custom), announcement rows (utility bar + marquee), flash sale prices (checkout unit override), marketing popups, site settings (first-visit coupon). Storefront: server-driven home hero/highlights/category grid, header announcements, `MarketingSiteEffects` (popup + first-visit prefill to checkout). Coupons support optional **category scope** (`coupon_categories`); every cart line must be in an allowed category. Public: `GET /api/public/marketing`.

**Follow-ups (optional):** Flash pricing on product listing cards (today: checkout only). Cart UI calling `POST /api/coupons/validate` with `lineItems` for live category-scoped validation. Richer hero/announcement scheduling UI (timezone presets).

---

## Reviews

12. **One review per customer per product** (or per order line, per final spec) — Enforce with a DB constraint + clear API errors.
13. **Admin “hide” vs reject** — Separate behaviors if both are required (not only `is_approved`).
14. **Admin response to reviews** — Schema field + admin UI + optional display on the product page.

---

## Returns & refunds (without automated gateway refunds)

15. **Admin returns queue** — List/filter returns, approve/reject, set status and refund amounts (APIs + UI).
16. **Customer return status** — Show return/refund status on account or order detail (read-only).
17. **Refund via payment provider** — Deferred with payment gateway work; until then, internal status + manual reconciliation is acceptable.

---

## Notifications (email)

18. **Abandoned cart reminders** — Scheduled job/cron, templates, and eligibility rules (timing, opt-out if required).

*Optional later (often paired with “mark shipped”):* simple “order shipped” email without carrier API — only if you want it before full tracking integration.

---

## RBAC & admin

19. **Finer permission matrix** — Map sensitive actions to roles explicitly (beyond broad admin / write checks), especially **SUPPORT** vs **STAFF**.

---

## System integrity

20. **Duplicate order prevention** — Idempotency on checkout (double-submit, retries).

---

## SEO & polish

21. **Canonical URLs** — `metadataBase` + per-route `alternates.canonical` aligned with `NEXT_PUBLIC_SITE_URL` (www vs apex).
22. **Structured data (optional)** — `Product` / `Organization` JSON-LD for rich results.

---

## Operations (spec §13)

23. **Provider-level backups** — Document steps for Hostinger / Vercel / database backups (no application code).

---

## Summary

| Theme              | Count (items above) |
| ------------------ | -------------------:|
| Checkout & accounts| 2                   |
| Tax & shipping     | 2                   |
| CMS & campaigns    | 0 (done; see note)  |
| Reviews            | 3                   |
| Returns & refunds  | 3                   |
| Email              | 1 (+ optional note) |
| RBAC               | 1                   |
| System integrity   | 1                   |
| SEO                | 2                   |
| Ops                | 1                   |

**Total:** 16 open items below (CMS merchandising block above is implemented; numbering below unchanged from the original spec list).
