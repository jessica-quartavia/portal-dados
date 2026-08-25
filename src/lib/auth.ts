export const ALLOWED_DOMAIN = 'quartavia.com.br';

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1] === ALLOWED_DOMAIN;
}
