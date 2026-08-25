import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';

function readEnv(name: string): string {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name];
  const fromProcess =
    typeof process !== 'undefined' ? process.env[name] : undefined;
  return (fromMeta || fromProcess || '').trim();
}

export function getAuthEnv(): { url: string; key: string; configured: boolean } {
  const url = readEnv('PUBLIC_AUTH_SUPABASE_URL');
  const key = readEnv('PUBLIC_AUTH_SUPABASE_ANON_KEY');
  return { url, key, configured: Boolean(url && key) };
}

/**
 * Cliente Supabase Auth server-side (cookies).
 * Retorna null se as variáveis não estiverem configuradas — nunca lança.
 */
export function createAuthServerClient(
  request: Request,
  cookies: AstroCookies,
): SupabaseClient | null {
  const { url, key, configured } = getAuthEnv();
  if (!configured) return null;

  try {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return (request.headers.get('cookie') ?? '')
            .split(';')
            .filter(Boolean)
            .flatMap((c) => {
              const idx = c.indexOf('=');
              if (idx < 1) return [];
              return [{ name: c.slice(0, idx).trim(), value: c.slice(idx + 1).trim() }];
            });
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, {
              httpOnly: options?.httpOnly ?? true,
              secure: import.meta.env.PROD,
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
              path: options?.path ?? '/',
              ...(options?.maxAge !== undefined && { maxAge: options.maxAge }),
              ...(options?.expires !== undefined && { expires: options.expires }),
            });
          });
        },
      },
    });
  } catch (error) {
    console.error('[Auth] falha ao criar cliente server:', error);
    return null;
  }
}
