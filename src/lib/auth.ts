export const ALLOWED_DOMAIN = 'quartavia.com.br';

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.toLowerCase().split('@');
  return parts.length === 2 && parts[1] === ALLOWED_DOMAIN;
}
