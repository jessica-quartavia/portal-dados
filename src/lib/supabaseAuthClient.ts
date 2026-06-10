import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Cliente Supabase Auth para uso no browser (Business Data: rckpuebaiswrxzmywllv).
 * Usa createBrowserClient do @supabase/ssr para armazenar o PKCE verifier em
 * cookies (não localStorage), garantindo que o callback server-side consiga
 * ler o verifier e completar o exchangeCodeForSession.
 */
export function getAuthSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = import.meta.env.PUBLIC_AUTH_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_AUTH_SUPABASE_ANON_KEY as string | undefined;

  if (!url?.trim()) {
    throw new Error('[Auth] PUBLIC_AUTH_SUPABASE_URL não definida. Configure o .env com base em .env.example.');
  }
  if (!key?.trim()) {
    throw new Error('[Auth] PUBLIC_AUTH_SUPABASE_ANON_KEY não definida. Configure o .env com base em .env.example.');
  }

  _client = createBrowserClient(url, key) as SupabaseClient;
  return _client;
}
