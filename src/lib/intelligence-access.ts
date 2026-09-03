export const INTELLIGENCE_ALLOWED_EMAILS = [
  'jessicacarvalho@quartavia.com.br',
  'thassyacosta@quartavia.com.br',
  'anagazzo@quartavia.com.br',
  'brunaarnold@quartavia.com.br',
  'matheuslacerda@quartavia.com.br',
] as const;

const ALLOWED_SET = new Set(
  INTELLIGENCE_ALLOWED_EMAILS.map((email) => email.trim().toLowerCase()),
);

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function isIntelligenceAllowedEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && ALLOWED_SET.has(normalized);
}

/** Rotas da área Interno Inteligência (/dashboards e sub-rotas). */
export function isIntelligencePath(pathname: string): boolean {
  return pathname === '/dashboards' || pathname.startsWith('/dashboards/');
}

export const INTELLIGENCE_AREA_PATH = '/dashboards';
