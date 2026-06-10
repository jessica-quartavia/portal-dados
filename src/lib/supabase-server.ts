import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

/**
 * Cria um cliente Supabase Auth server-side que lê/escreve sessão via cookies.
 * Usar apenas em middleware, API routes e páginas Astro (server-side).
 * Conecta ao projeto Business Data (rckpuebaiswrxzmywllv) — autenticação.
 */
export function createAuthServerClient(request: Request, cookies: AstroCookies) {
  const url = import.meta.env.PUBLIC_AUTH_SUPABASE_URL as string;
  const key = import.meta.env.PUBLIC_AUTH_SUPABASE_ANON_KEY as string;

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
      setAll(cookiesToSet) {
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
}
