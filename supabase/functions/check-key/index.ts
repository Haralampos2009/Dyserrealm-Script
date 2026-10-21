import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IP_HASH_SECRET = Deno.env.get("IP_HASH_SECRET")!;
const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", "Cache-Control": "no-store" };
function reply(body: unknown) { return new Response(JSON.stringify(body), { status: 200, headers: cors }); }
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function invalid(reason: string) { return { valid: false, reason }; }

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") return reply(invalid("bad_format"));
    const url = new URL(req.url);
    const key = (url.searchParams.get("key") || "").trim().toUpperCase();
    const uidText = (url.searchParams.get("uid") || "").trim();
    if (!/^DS-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/.test(key) || !/^\\d{1,20}$/.test(uidText)) {
      return reply(invalid("bad_format"));
    }
    const uid = Number(uidText);
    if (!Number.isSafeInteger(uid) || uid <= 0) return reply(invalid("bad_format"));

    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await sha256(IP_HASH_SECRET + ":" + ip);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const limit = await admin.rpc("consume_key_rate_limit", {
      p_bucket: "check_ip_minute", p_subject_hash: ipHash, p_limit: 20, p_window_seconds: 60,
    });
    if (limit.error) return reply(invalid("rate_limited"));
    if (!limit.data?.[0]?.allowed) return reply(invalid("rate_limited"));

    const { data, error } = await admin.rpc("validate_realm_key", { p_key: key, p_roblox_id: uid });
    if (error || !data?.length) return reply(invalid("not_found"));
    const result = data[0];
    if (!result.valid) return reply(invalid(result.reason || "not_found"));
    return reply({ valid: true, reason: "ok", seconds_left: result.seconds_left });
  } catch {
    return reply(invalid("not_found"));
  }
});
