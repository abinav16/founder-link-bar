// Mirrors send-email/delivery.ts; edge functions bundle independently and cannot import each other.
export const FROM = 'StartupBar <hello@startupbar.co>';
export const ADMIN_EMAIL = 'danielabinav16@gmail.com';

export function appEmailCc(to: string | string[]): { cc?: string } {
  const recipients = Array.isArray(to) ? to : [to];
  return recipients.some((email) => email.trim().toLowerCase() === ADMIN_EMAIL)
    ? {}
    : { cc: ADMIN_EMAIL };
}
