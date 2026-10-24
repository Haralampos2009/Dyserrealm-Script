import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    const { username, password } = await req.json();
    const cleanUsername = String(username ?? "").trim();
    if (!cleanUsername || cleanUsername.length > 32 || !password || String(password).length > 128) {
      return json({ error: "Enter your username and password." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Username login is not configured yet." }, 500);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: mapping, error: lookupError } = await admin
      .from("username_login_map")
      .select("email")
      .eq("username_normalized", cleanUsername.toLowerCase())
      .maybeSingle();

    // Use the same public error for unknown usernames and wrong passwords.
    if (lookupError || !mapping?.email) return json({ error: "Username or password is incorrect." }, 401);

    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: mapping.email, password: String(password) });
    if (error || !data.session) return json({ error: "Username or password is incorrect." }, 401);

    return json({ session: data.session, user: data.user }, 200);
  } catch {
    return json({ error: "Could not sign in. Check your username and password." }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
