# Supplier Workbench

Studio queue for ViewBrush portrait delivery, revisions, and shipping.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Default port: `3200`.

## Required env

- `SESSION_SECRET`
- `SUPPLIER_ADMIN_PASSWORD`
- `SUPPLIER_ADMIN_USER` (optional, default `admin`)
- `ACCOUNT_HMAC_SECRET` or `SUPPLIER_HMAC_SECRET` (must match pet app)
- `PET_APP_URL` (e.g. `https://pet-paiting-app.vercel.app`)
- `SHOPIFY_SHOP` (e.g. `e-commerce-dev-v6yidmlw.myshopify.com`)
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (login lock table; login returns 503 without it)

## Tabs

- **待处理**: `order_placed`, `supplier_modification`, `prepare_shipment`
- **等待客户**: `portrait_review`
- **已完成**: `shipped`
