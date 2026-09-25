function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value.replace(/\/$/, "");
}

export function getEnv() {
  return {
    sessionSecret: required("SESSION_SECRET"),
    adminPassword: required("SUPPLIER_ADMIN_PASSWORD"),
    adminUser: process.env.SUPPLIER_ADMIN_USER?.trim() || "admin",
    hmacSecret:
      process.env.SUPPLIER_HMAC_SECRET?.trim() ||
      required("ACCOUNT_HMAC_SECRET"),
    petAppUrl: required("PET_APP_URL"),
    shopDomain: required("SHOPIFY_SHOP"),
    supabaseUrl: process.env.SUPABASE_URL?.trim() || "",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY?.trim() || "",
  };
}
