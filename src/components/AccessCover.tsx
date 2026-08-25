import { useEffect, useState } from 'react';
import { getAuthSupabase } from '../lib/supabaseAuthClient';
import { isAllowedEmail } from '../lib/auth';

export default function AccessCover() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const { data } = await getAuthSupabase().auth.getSession();
        const email = data.session?.user.email;
        if (!data.session || !isAllowedEmail(email)) {
          window.location.replace('/login');
          return;
        }
      } catch {
        window.location.replace('/login?error=auth_config');
        return;
      }
      if (!cancelled) setChecking(false);
    }

    if (import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      setChecking(false);
      return;
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checking) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--color-bg)',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
      }}
      role="status"
      aria-live="polite"
    >
      Verificando acesso…
    </div>
  );
}
