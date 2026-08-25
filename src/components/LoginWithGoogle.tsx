import { useState } from 'react';
import { getAuthSupabase } from '../lib/supabaseAuthClient';

function getAuthRedirectTo() {
  return `${window.location.origin}/auth/callback`;
}

export default function LoginWithGoogle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await getAuthSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectTo(),
          queryParams: {
            hd: 'quartavia.com.br',
            prompt: 'select_account',
          },
        },
      });
      if (oauthError) {
        console.error('Google OAuth error:', oauthError);
        setError(oauthError.message);
        setLoading(false);
      }
    } catch (err) {
      console.error('Google OAuth error:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="qv-google-auth">
      {error && (
        <div className="qv-google-auth__error" role="alert">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="qv-google-auth__btn"
      >
        {loading ? (
          <>
            <svg className="qv-google-auth__spin" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"
                strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
            </svg>
            Redirecionando…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M17.64 9.2a10.4 10.4 0 0 0-.164-1.84H9v3.48h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.996 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </>
        )}
      </button>
      <style>{`
        .qv-google-auth {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .qv-google-auth__error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-danger-soft);
          color: var(--color-danger);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          font-size: var(--fs-sm);
          font-weight: var(--fw-medium);
        }
        .qv-google-auth__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          height: 44px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-family: var(--font-heading);
          font-size: var(--fs-sm);
          font-weight: 500;
          cursor: pointer;
        }
        .qv-google-auth__btn:hover:not(:disabled) {
          background: var(--color-surface);
          border-color: var(--color-border-strong);
        }
        .qv-google-auth__btn:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
        .qv-google-auth__btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .qv-google-auth__spin {
          flex-shrink: 0;
          animation: qv-google-spin .8s linear infinite;
        }
        @keyframes qv-google-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .qv-google-auth__spin { animation: none; }
        }
      `}</style>
    </div>
  );
}
