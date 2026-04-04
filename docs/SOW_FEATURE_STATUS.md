SOW Feature Status

1) Partially done

- Returns & refunds workflow (return flow basics exist; full gateway-confirmed refund lifecycle is pending).
- Promotional / newsletter-style emails (transactional order + cart emails are implemented).
- SEO setup (friendly URLs/basic metadata exist; canonical/structured-data polish remains).
- Backup assistance (requires ops/documentation handoff; not a pure code-complete item).

2) Completely done

- Homepage rendered from dynamic content configuration.
- Product listing and product detail pages.
- Age-based filtering on Shop listings with product age guidance on cards/detail.
- Product reviews: one review per purchased item enforced (moderation remains active).
- Order & fulfilment emails: customer notified on order status changes (admin + payment flows), shipment field updates, and abandoned-cart reminders (logged-in carts synced server-side; cron).
- Stock low-level alerts to admin: threshold-crossing email alerts with dedupe/reset logic.
- Account linkage at checkout: orders create/reuse customer accounts by checkout email (set-password flow supported).
- Image gallery.
- Product variants.
- Search and filtering.
- Cart management.
- Address management.
- Order history.
- Order status tracking.
- Invoice download.
- Gift options (gift message + gift flag).
- Dynamic CMS & Merchandising core:
  - Hero banners with schedule/visibility.
  - Featured / trending / category highlights.
  - Announcement bar (CMS-driven).
  - Coupons.
  - Category discounts (coupon category scoping + cart rules).
  - Cart value offers (coupon minimum cart value).
  - Flash sales (implemented in checkout pricing flow).
  - First-visit offers.
  - Popup campaigns.
  - Frontend rendering dynamically from stored configuration.
- Admin panel core:
  - Product management.
  - Bulk product upload (CSV).
  - Image association via URL/filename workflow.
  - Inventory tracking.
  - Order management.
  - Coupon management.
  - Sales analytics dashboard.
  - Review moderation.
- Inventory protection:
  - Reserve stock during checkout/payment window.
  - Release on failed/cancelled payment.
  - Overselling prevention in normal operation.
- Security foundations:
  - Secure authentication/session/RBAC baseline.
  - Encrypted password storage.

3) Not done at all

- Refund processed through payment gateway with gateway confirmation (full refund integration pending).
- Legal/privacy compliance deliverables (as scoped, this is client responsibility, not a build deliverable).
