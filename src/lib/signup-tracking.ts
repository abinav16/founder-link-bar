export const ATTRIBUTION_DAYS = 30;
export const ATTRIBUTION_MS = ATTRIBUTION_DAYS * 86400000;
export const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
export const BLOCKED_SUCCESS_PATHS = new Set(['/', '/login', '/signin', '/signup', '/register', '/dashboard']);

export function normalizeSuccessPath(value: string): string {
  const path = value.trim().replace(/\/$/, '') || '/';
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 200 || /[?#\\\s%]/.test(path) || BLOCKED_SUCCESS_PATHS.has(path)) {
    throw new Error('Use a dedicated signup-complete path, such as /signup/complete. Login, signup forms and dashboards cannot confirm new accounts.');
  }
  return path;
}

export function withinAttributionWindow(createdAt: number, now: number): boolean {
  return now >= createdAt && now - createdAt <= ATTRIBUTION_MS;
}

export function matchesPartnerOrigin(origin: string, website: string): boolean {
  try {
    const a = new URL(origin), b = new URL(website);
    return a.protocol === 'https:' && b.protocol === 'https:' && a.port === b.port && a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '');
  } catch { return false; }
}

export function cohortConversionRate(verified: number, referrals: number): string | null {
  return referrals > 0 ? (verified / referrals * 100).toFixed(1) : null;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function randomReferralToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(v => v.toString(16).padStart(2, '0')).join('');
}

export async function hmacSignature(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(result)].map(v => v.toString(16).padStart(2, '0')).join('');
}

export async function verifySignupSignature(secret: string, timestamp: string, raw: string, signature: string, now = Date.now()): Promise<boolean> {
  if (!/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || !TOKEN_PATTERN.test(signature)) return false;
  const expected = await hmacSignature(secret, `${timestamp}.${raw}`);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return difference === 0;
}

export interface SignupSettings {
  enabled: boolean;
  success_path: string | null;
  configured_at: string;
  last_browser_report_at: string | null;
  last_server_report_at: string | null;
  last_test_at: string | null;
}
export interface SignupSummary {
  settings: SignupSettings | null;
  verified: number;
  reported: number;
  referrals: number;
  cohort_verified: number;
  hosts: { name: string | null; verified: number; reported: number }[];
}