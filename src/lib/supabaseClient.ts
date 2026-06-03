import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase client, initialising it on first call.
 * Validation is deferred to runtime so the module can be imported during
 * Astro's SSG phase without throwing.
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url?.trim()) {
    throw new Error(
      '[Pharus] PUBLIC_SUPABASE_URL não definida. Crie um arquivo .env com base em .env.example.'
    );
  }
  if (!key?.trim()) {
    throw new Error(
      '[Pharus] PUBLIC_SUPABASE_ANON_KEY não definida. Crie um arquivo .env com base em .env.example.'
    );
  }

  _client = createClient(url, key);
  return _client;
}
