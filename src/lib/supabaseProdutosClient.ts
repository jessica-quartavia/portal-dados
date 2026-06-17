import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _envLogged = false;

function logProdutosEnvOnce() {
  if (_envLogged) return;
  _envLogged = true;
  console.log('[Produtos env]', {
    hasUrl: Boolean(import.meta.env.PUBLIC_PRODUTOS_SUPABASE_URL),
    hasKey: Boolean(import.meta.env.PUBLIC_PRODUTOS_SUPABASE_ANON_KEY),
    url: import.meta.env.PUBLIC_PRODUTOS_SUPABASE_URL,
  });
}

export function isProdutosSupabaseConfigured(): boolean {
  logProdutosEnvOnce();
  const url = import.meta.env.PUBLIC_PRODUTOS_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_PRODUTOS_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url?.trim() && key?.trim());
}

/**
 * Cliente Supabase para dados do dashboard Produtos (projeto separado do Business Data).
 * NÃO usar para autenticação.
 */
export function getProdutosSupabase(): SupabaseClient | null {
  logProdutosEnvOnce();
  if (_client) return _client;

  const url = import.meta.env.PUBLIC_PRODUTOS_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_PRODUTOS_SUPABASE_ANON_KEY as string | undefined;

  if (!url?.trim() || !key?.trim()) return null;

  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}
