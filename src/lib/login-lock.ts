import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

function client() {
  const { supabaseUrl, supabaseServiceKey } = getEnv();
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getLoginLock(ip: string): Promise<{
  locked: boolean;
  lockedUntil: string | null;
}> {
  const sb = client();
  if (!sb) return { locked: false, lockedUntil: null };
  const { data } = await sb
    .from("supplier_login_attempts")
    .select("*")
    .eq("ip", ip)
    .maybeSingle();
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
  if (!sb) return { failCount: 1, lockedUntil: null };
  const { data: existing } = await sb
    .from("supplier_login_attempts")
    .select("*")
    .eq("ip", ip)
    .maybeSingle();
  const failCount = (existing?.fail_count || 0) + 1;
  const lockedUntil =
    failCount >= 5
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null;
  await sb.from("supplier_login_attempts").upsert({
    ip,
    fail_count: failCount,
    locked_until: lockedUntil,
    updated_at: new Date().toISOString(),
  });
  return { failCount, lockedUntil };
}

export async function clearLoginFailures(ip: string): Promise<void> {
  const sb = client();
  if (!sb) return;
  await sb.from("supplier_login_attempts").delete().eq("ip", ip);
}
