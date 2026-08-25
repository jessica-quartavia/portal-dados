import { defineMiddleware } from 'astro:middleware';
import { createAuthServerClient } from './lib/supabase-server';
import { isAllowedEmail } from './lib/auth';

const PUBLIC_PATHS = new Set([
  '/login',
  '/auth/callback',
  '/dashboards/produtos',
  '/dashboards/iapmai26-agendamentos',
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_astro/')) return true;
  if (pathname.startsWith('/_image')) return true;
  if (pathname === '/favicon.ico' || pathname === '/robots.txt') return true;
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  try {
    const isLoopback =
      context.url.hostname === '127.0.0.1' || context.url.hostname === 'localhost';
    if (import.meta.env.DEV && isLoopback) return next();

    if (isPublic(pathname)) return next();

    const supabase = createAuthServerClient(context.request, context.cookies);
    if (!supabase) {
      return context.redirect('/login?error=auth_config');
    }

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return context.redirect('/login');
    }

    if (!isAllowedEmail(data.session.user.email)) {
      try {
        await supabase.auth.signOut();
      } catch {
        // signOut falhou — ainda assim bloqueia o acesso
      }
      return context.redirect('/login?error=unauthorized_domain');
    }

    return next();
  } catch (error) {
    console.error('[middleware] falha inesperada em', pathname, error);
    if (pathname === '/login' || pathname.startsWith('/auth/')) {
      return next();
    }
    return context.redirect('/login');
  }
});
