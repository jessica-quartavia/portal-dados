import type { APIRoute } from 'astro';
import { createAuthServerClient } from '../../lib/supabase-server';

export const prerender = false;

async function doLogout(request: Request, cookies: Parameters<APIRoute>[0]['cookies']) {
  try {
    const supabase = createAuthServerClient(request, cookies);
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error('[logout] falha ao encerrar sessão:', error);
  }
  return new Response(null, { status: 302, headers: { Location: '/login' } });
}

export const POST: APIRoute = ({ request, cookies }) => doLogout(request, cookies);
export const GET: APIRoute  = ({ request, cookies }) => doLogout(request, cookies);
