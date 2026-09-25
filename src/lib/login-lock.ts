import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

/** Login is refused when lockout storage is unavailable, so brute-force protection can't silently turn off. */
export class LoginProtectionUnavailable extends Error {}

function client() {
  const { supabaseUrl, supabaseServiceKey } = getEnv();
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new LoginProtectionUnavailable("SUPABASE_URL / SUPABASE_SERVICE_KEY not configured");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function unavailable(message: string): never {
  throw new LoginProtectionUnavailable(message);
}

export async function getLoginLock(ip: string): Promise<{
  locked: boolean;
  lockedUntil: string | null;
}> {
  const { data, error } = await client()
    .from("supplier_login_attempts")
    .select("*")
    .eq("ip", ip)
    .maybeSingle();
  if (error) unavailable(error.message);
  if (!data?.locked_until) return { locked: false, lockedUntil: null };
  if (new Date(data.locked_until).getTime() > Date.now()) {
    return { locked: true, lockedUntil: data.locked_until };
  }
  return { locked: false, lockedUntil: null };
}

export async function recordLoginFailure(ip: string): Promise<{
  failCount: number;
  lockedUntil: string | null;
}> {
  const sb = client();
  const { data: existing, error } = await sb
    .from("supplier_login_attempts")
    .select("*")
    .eq("ip", ip)
    .maybeSingle();
  if (error) unavailable(error.message);
  const expiredLock =
    existing?.locked_until && new Date(existing.locked_until).getTime() <= Date.now();
  const failCount = (expiredLock ? 0 : existing?.fail_count || 0) + 1;
  const lockedUntil =
    failCount >= MAX_FAILURES ? new Date(Date.now() + LOCK_MS).toISOString() : null;
  const { error: writeError } = await sb.from("supplier_login_attempts").upsert({
    ip,
    fail_count: failCount,
    locked_until: lockedUntil,
    updated_at: new Date().toISOString(),
  });
  if (writeError) unavailable(writeError.message);
  return { failCount, lockedUntil };
}

export async function clearLoginFailures(ip: string): Promise<void> {
  const { error } = await client().from("supplier_login_attempts").delete().eq("ip", ip);
  if (error) console.error("[login-lock] clear failed", error.message);
}
