import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID") || "";
const IP_HASH_SECRET = Deno.env.get("IP_HASH_SECRET") || "";
const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_SITE_ORIGIN") || "https://haralampos2009.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
function reply(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
        const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "login_required" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "invalid_session" }, 401);
    let allowed = !!OWNER_USER_ID && auth.user.id === OWNER_USER_ID;
    const { data: roleRows, error: roleError } = await admin.from("site_roles").select("role").eq("user_id", auth.user.id).limit(5);
    if (!roleError && (roleRows || []).some((r: { role?: string }) => ["creator", "admin"].includes(String(r.role || "").toLowerCase()))) allowed = true;
    if (!allowed) return reply({ error: "forbidden" }, 403);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const search = (url.searchParams.get("search") || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 80);
      let query = admin.from("keys").select("id,key,created_at,expires_at,revoked,bound_roblox_id,use_count,last_used_at,created_by_user_id").order("created_at", { ascending: false }).limit(100);
            if (search) query = query.or("key.ilike.%"+search+"%,bound_roblox_id.eq."+(/^\d+$/.test(search) ? search : "0"));
      const { data, error } = await query;
      if (error) return reply({ error: "temporarily_unavailable" }, 503);
      return reply({ keys: data || [] });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = body.action;
      if (action === "issue") {
        const username = String(body.roblox_username || "").trim();
        const duration = String(body.duration || "24h");
        const hours: Record<string, number> = { "1h": 1, "12h": 12, "24h": 24, "7d": 168, "30d": 720 };
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username) || !(duration === "forever" || duration in hours)) return reply({ error: "bad_request" }, 400);
        const { data: profiles, error: profileError } = await admin.from("realm_profiles").select("user_id,roblox_username").ilike("roblox_username", username).limit(2);
        if (profileError) return reply({ error: "profile_lookup_failed" }, 503);
        const profile = (profiles || []).find((p: { roblox_username?: string }) => String(p.roblox_username || "").toLowerCase() === username.toLowerCase());
        if (!profile) return reply({ error: "player_not_registered" }, 404);
        let robloxId: number | null = null;
        try {
          const response = await fetch("https://users.roblox.com/v1/usernames/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }) });
          if (!response.ok) return reply({ error: "roblox_lookup_failed" }, 502);
          const json = await response.json();
          const found = Array.isArray(json.data) ? json.data[0] : null;
          if (found && Number.isSafeInteger(found.id) && found.id > 0) robloxId = found.id;
        } catch { return reply({ error: "roblox_lookup_failed" }, 502); }
        if (!robloxId) return reply({ error: "roblox_user_not_found" }, 404);
        if (!IP_HASH_SECRET) return reply({ error: "server_not_configured" }, 503);
        const expiresAt = duration === "forever" ? "9999-12-31T23:59:59.000Z" : new Date(Date.now() + hours[duration] * 3600000).toISOString();
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(IP_HASH_SECRET + ":creator:" + auth.user.id));
        const creatorHash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        for (let attempt = 0; attempt < 5; attempt++) {
          const bytes = crypto.getRandomValues(new Uint8Array(16));
          const key = "DS-" + Array.from({ length: 4 }, (_, i) => Array.from(bytes.slice(i * 4, i * 4 + 4), b => alphabet[b % alphabet.length]).join("")).join("-");
          const { data: created, error: createError } = await admin.from("keys").insert({ key, expires_at: expiresAt, revoked: false, bound_roblox_id: robloxId, created_by_ip_hash: creatorHash, created_by_user_id: auth.user.id }).select("id,key,created_at,expires_at,revoked,bound_roblox_id,use_count,last_used_at,created_by_user_id").single();
          if (!createError && created) return reply({ success: true, key: created, roblox_username: username });
          if (createError?.code !== "23505") return reply({ error: "key_issue_failed" }, 503);
        }
        return reply({ error: "key_generation_failed" }, 503);
      }

      const id = typeof body.id === "string" ? body.id : "";
      if (!id || !["revoke", "reset_binding"].includes(action)) return reply({ error: "bad_request" }, 400);
      const patch = action === "revoke" ? { revoked: true } : { bound_roblox_id: null };
      const { error } = await admin.from("keys").update(patch).eq("id", id);
      if (error) return reply({ error: "temporarily_unavailable" }, 503);
      return reply({ success: true });
    }
    return reply({ error: "method_not_allowed" }, 405);
  } catch {
    return reply({ error: "temporarily_unavailable" }, 503);
  }
});
