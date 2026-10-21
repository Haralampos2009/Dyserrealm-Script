import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY")!;
const IP_HASH_SECRET = Deno.env.get("IP_HASH_SECRET")!;
const KEY_TTL_HOURS = Math.max(1, Math.min(168, Number(Deno.env.get("KEY_TTL_HOURS") || "24")));
const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_SITE_ORIGIN") || "https://haralampos2009.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const groups = Array.from({ length: 4 }, (_, group) =>
    Array.from(bytes.slice(group * 4, group * 4 + 4), (b) => alphabet[b % alphabet.length]).join("")
  );
  return "DS-" + groups.join("-");
}
async function verifyTurnstile(token: string, ip: string) {
  if (!TURNSTILE_SECRET || !token) return false;
  const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
  if (ip && ip !== "unknown") form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\\s+/i, "");
    if (!token) return reply({ error: "login_required" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return reply({ error: "invalid_session" }, 401);

    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await sha256(IP_HASH_SECRET + ":" + ip);
    const body = await req.json().catch(() => ({}));
    if (typeof body.turnstile_token !== "string" || !(await verifyTurnstile(body.turnstile_token, ip))) {
      return reply({ error: "captcha_failed", message: "Complete the CAPTCHA and try again." }, 400);
    }

    // Return the signed-in user's own active key instead of issuing duplicates.
    const { data: existing, error: existingError } = await admin.from("keys")
      .select("key,expires_at")
      .eq("created_by_user_id", authData.user.id)
      .eq("revoked", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) return reply({ error: "temporarily_unavailable" }, 503);
    if (existing) return reply({ key: existing.key, expires_at: existing.expires_at, format: "DS-XXXX-XXXX-XXXX-XXXX", existing: true });

    const ipLimit = await admin.rpc("consume_key_rate_limit", {
      p_bucket: "generate_ip_day", p_subject_hash: ipHash, p_limit: 3, p_window_seconds: 86400,
    });
    if (ipLimit.error) return reply({ error: "temporarily_unavailable" }, 503);
    if (!ipLimit.data?.[0]?.allowed) return reply({ error: "daily_limit", retry_after: ipLimit.data[0].retry_after }, 429);

    const userHash = await sha256(IP_HASH_SECRET + ":user:" + authData.user.id);
    const userLimit = await admin.rpc("consume_key_rate_limit", {
      p_bucket: "generate_user_day", p_subject_hash: userHash, p_limit: 3, p_window_seconds: 86400,
    });
    if (userLimit.error) return reply({ error: "temporarily_unavailable" }, 503);
    if (!userLimit.data?.[0]?.allowed) return reply({ error: "daily_limit", retry_after: userLimit.data[0].retry_after }, 429);

    const expiresAt = new Date(Date.now() + KEY_TTL_HOURS * 3600_000).toISOString();
    for (let attempt = 0; attempt < 5; attempt++) {
      const key = randomKey();
      const { data, error } = await admin.rpc("issue_realm_key", {
        p_key: key, p_expires_at: expiresAt, p_ip_hash: ipHash, p_user_id: authData.user.id,
      });
      if (error) return reply({ error: "temporarily_unavailable" }, 503);
      const result = data?.[0];
      if (result?.issued) return reply({ key, expires_at: result.expires_at, format: "DS-XXXX-XXXX-XXXX-XXXX" });
      if (result?.reason === "active_key_exists") return reply({ error: "active_key_exists" }, 409);
      if (result?.reason !== "collision") return reply({ error: "temporarily_unavailable" }, 503);
    }
    return reply({ error: "key_generation_failed" }, 503);
  } catch {
    return reply({ error: "temporarily_unavailable" }, 503);
  }
});
