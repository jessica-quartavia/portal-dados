import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.PUBLIC_SUPABASE_RESEARCH_URL ||
    import.meta.env.PUBLIC_SUPABASE_BUSINESS_URL ||
    import.meta.env.PUBLIC_SUPABASE_ANCHOR_URL;
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.PUBLIC_SUPABASE_RESEARCH_ANON_KEY ||
    import.meta.env.PUBLIC_SUPABASE_BUSINESS_ANON_KEY ||
    import.meta.env.PUBLIC_SUPABASE_ANCHOR_ANON_KEY;

  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function getSupabaseEnvStatus() {
  return getSupabaseClient() ? "configured" : "missing";
}
