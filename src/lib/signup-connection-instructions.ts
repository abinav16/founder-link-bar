export function signupConnectionInstructions(startupId?: string): string {
  return `Connect our signup system to StartupBar using our existing StartupBar widget. No second widget installation.

After a genuinely NEW account has been successfully created, send a signed confirmation from our server. Never report returning logins, page visits, refreshes, purchases or failed signups.

Capture the 64-character _sbref referral token supplied by StartupBar. Integrate the existing consent manager with window.startupbarConversionConsent = true or the startupbar:conversion-consent event after analytics consent, and granted:false on withdrawal. Respect GPC and Do Not Track. Preserve the consented referral token securely with the signup for up to 30 days; do not invent a token or extend its expiry. If signup is on another domain, transfer the referral securely with the signup flow, not through public logs.

POST https://startupbar.co/api/public/signup/confirm
Content-Type: application/json
X-StartupBar-Timestamp: <10-digit Unix seconds>
X-StartupBar-Signature: <hex HMAC-SHA256>

{"startup_id":"${startupId ?? '<startup ID from the StartupBar dashboard>'}","referral_token":"<64-character _sbref token>","event_id":"<opaque unique new-account event ID>"}

Store the private signing key from StartupBar in server secrets only. Never put it in browser code, a public page or this prompt. Sign timestamp + "." + the exact JSON request body with HMAC-SHA256 using that key.
Retry network errors, 429 and 5xx with backoff; reuse the same event_id and re-sign each retry. Do not retry other 4xx errors. Do not send names, emails, passwords or customer details.
Update the privacy notice. Test with a StartupBar test referral and a test new account; test reports must stay excluded from real signup totals. These confirmations are signed partner reports, not independently audited signups.`;
}