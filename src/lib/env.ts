function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value.replace(/\/$/, "");
}

const DEV_SHOP = "e-commerce-dev-v6yidmlw.myshopify.com";
const LIVE_SHOP = "6hcr01-9t.myshopify.com";
const RETIRED_SHOP = "w4yzmt-vv.myshopify.com";

function normalizeShop(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0];
}

export function shopChoices(): string[] {
  const fromList = (process.env.SHOPIFY_SHOPS || "")
    .split(",")
    .map(normalizeShop)
    .filter(Boolean);
  const single = process.env.SHOPIFY_SHOP?.trim()
    ? [normalizeShop(process.env.SHOPIFY_SHOP)]
    : [];
  return [...new Set([...single, ...fromList, DEV_SHOP, LIVE_SHOP])].filter(
    (shop) => shop !== RETIRED_SHOP,
  );
}

export function getEnv() {
  const shops = shopChoices();
  return {
    sessionSecret: required("SESSION_SECRET"),
    adminPassword: required("SUPPLIER_ADMIN_PASSWORD"),
    adminUser: process.env.SUPPLIER_ADMIN_USER?.trim() || "admin",
    hmacSecret:
      process.env.SUPPLIER_HMAC_SECRET?.trim() ||
      required("ACCOUNT_HMAC_SECRET"),
    petAppUrl: required("PET_APP_URL"),
    shopDomain: shops[0] || DEV_SHOP,
    shops,
    supabaseUrl: process.env.SUPABASE_URL?.trim() || "",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY?.trim() || "",
  };
}
