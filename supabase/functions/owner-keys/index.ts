import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID") || "";\nconst IP_HASH_SECRET = Deno.env.get("IP_HASH_SECRET") || "";
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
    if (authError || !auth.user) return reply({ error: "invalid_session" }, 401);\n    let allowed = !!OWNER_USER_ID && auth.user.id === OWNER_USER_ID;\n    const { data: roleRows, error: roleError } = await admin.from("site_roles").select("role").eq("user_id", auth.user.id).limit(5);\n    if (!roleError && (roleRows || []).some((r: { role?: string }) => ["creator", "admin"].includes(String(r.role || "").toLowerCase()))) allowed = true;\n    if (!allowed) return reply({ error: "forbidden" }, 403);

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
      const id = typeof body.id === "string" ? body.id : "";
      const action = body.action;
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
