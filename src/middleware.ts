import { defineMiddleware } from 'astro:middleware';
import { createAuthServerClient } from './lib/supabase-server';
import { isAllowedEmail } from './lib/auth';

const PUBLIC_PATHS = new Set(['/login', '/auth/callback', '/dashboards/produtos', '/dashboards/iapmai26-agendamentos']);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/')) return true;       // todas as API routes
  if (pathname.startsWith('/_astro/')) return true;
  if (pathname.startsWith('/_image')) return true;
  if (pathname === '/favicon.ico' || pathname === '/robots.txt') return true;
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (isPublic(pathname)) return next();

  const supabase = createAuthServerClient(context.request, context.cookies);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return context.redirect('/login');
  }

  if (!isAllowedEmail(session.user.email)) {
    await supabase.auth.signOut();
    return context.redirect('/login?error=unauthorized_domain');
  }

  return next();
});

