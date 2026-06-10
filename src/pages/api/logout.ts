import type { APIRoute } from 'astro';
import { createAuthServerClient } from '../../lib/supabase-server';

async function doLogout(request: Request, cookies: Parameters<APIRoute>[0]['cookies']) {
  const supabase = createAuthServerClient(request, cookies);
  await supabase.auth.signOut();
  return new Response(null, { status: 302, headers: { Location: '/login' } });
}

export const POST: APIRoute = ({ request, cookies }) => doLogout(request, cookies);
export const GET: APIRoute  = ({ request, cookies }) => doLogout(request, cookies);
