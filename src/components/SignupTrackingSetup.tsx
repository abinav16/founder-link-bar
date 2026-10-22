import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check, ShieldCheck } from 'lucide-react';

export interface SignupTrackingDraft { enabled: boolean; successPath: string; consentAcknowledged: boolean }
export const emptySignupDraft: SignupTrackingDraft = { enabled: false, successPath: '', consentAcknowledged: false };

export function SignupTrackingSetup({ value, onChange, prefix = 'signup-tracking' }: { value: SignupTrackingDraft; onChange: (value: SignupTrackingDraft) => void; prefix?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const prompt = `Enable optional StartupBar signup reporting using the StartupBar loader already installed. Track only genuinely new account creation, never returning login, form submission, pricing views or purchases. Use a dedicated signup-complete path ${value.successPath || '/signup/complete'} only after the account is successfully created. On the same approved website origin, keep the existing loader installed on that page. Integrate with our existing consent manager: after analytics consent is granted set window.startupbarConversionConsent = true before the loader, or dispatch window.dispatchEvent(new CustomEvent('startupbar:conversion-consent', {detail:{granted:true}})). Dispatch granted:false on withdrawal. Do not bypass consent, GPC or Do Not Track. StartupBar stores an anonymous referral token for at most 30 days. Do not send emails, names or account details. If our signup runs on another domain or no dedicated success page exists, use StartupBar's signed server confirmation option instead. Update our privacy notice and test using a StartupBar test referral; tests must not count as real signups.`;
  return <section className="signup-tracking-ui border-t border-border py-6 text-foreground" aria-labelledby={`${prefix}-title`}>
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" /><h2 id={`${prefix}-title`} className="text-base font-semibold">Signup tracking</h2></div><p className="mt-1 text-sm text-muted-foreground">Optional · 30-day referral attribution</p></div>
      <Switch aria-label="Enable signup tracking" checked={value.enabled} onCheckedChange={enabled => onChange({ ...value, enabled })} />
    </div>
    {value.enabled && <div className="mt-5 space-y-5">
      <div className="space-y-2"><Label htmlFor={`${prefix}-path`}>Signup-complete page</Label><Input id={`${prefix}-path`} placeholder="/signup/complete" value={value.successPath} maxLength={200} onChange={e => onChange({ ...value, successPath: e.target.value })} /><p className="text-xs leading-relaxed text-muted-foreground">A page shown only after a new account is created, on your listed website. Leave blank for signed server confirmation.</p></div>
      <div className="flex items-start gap-3"><Checkbox id={`${prefix}-consent`} checked={value.consentAcknowledged} onCheckedChange={checked => onChange({ ...value, consentAcknowledged: checked === true })} /><Label htmlFor={`${prefix}-consent`} className="text-xs font-normal leading-relaxed">I’ll confirm only new accounts, update my privacy notice and connect browser tracking to analytics consent. Browser reports are not server-verified signups.</Label></div>
      <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setCopyError(false); window.setTimeout(() => setCopied(false),2000); } catch { setCopyError(true); } }}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy setup for your developer or AI'}</Button></div>
      {copyError && <p role="alert" className="text-xs text-muted-foreground">Clipboard access is unavailable. Please allow it and try again.</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">No second widget install. Consent wiring and a genuine signup-complete page are still required. Blocked browsers, cross-device signups and other domains may remain untracked.</p>
    </div>}
  </section>;
}