import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Cliente Supabase para dados do dashboard Pharus (qvtqufdivpbmubooawdm).
 * Usar apenas para leitura de core.user_progress e realtime.
 * NÃO usar para autenticação.
 */
export function getPharusSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = import.meta.env.PUBLIC_PHARUS_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_PHARUS_SUPABASE_ANON_KEY as string | undefined;

  if (!url?.trim()) {
    throw new Error('[Pharus] PUBLIC_PHARUS_SUPABASE_URL não definida. Configure o .env com base em .env.example.');
  }
  if (!key?.trim()) {
    throw new Error('[Pharus] PUBLIC_PHARUS_SUPABASE_ANON_KEY não definida. Configure o .env com base em .env.example.');
  }

  _client = createClient(url, key);
  return _client;
}
