import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowRight, ArrowLeft, ShieldCheck, FileCheck2, Code2, Loader2 } from 'lucide-react';
import { normalizeSuccessPath } from '@/lib/signup-tracking';

export interface SignupTrackingDraft { enabled: boolean; successPath: string; consentAcknowledged: boolean }
export const emptySignupDraft: SignupTrackingDraft = { enabled: false, successPath: '', consentAcknowledged: false };

export function SignupTrackingSetup({ value, onChange, prefix = 'signup-tracking', showToggle = true, onComplete, busy = false }: { value: SignupTrackingDraft; onChange: (value: SignupTrackingDraft) => void; prefix?: string; showToggle?: boolean; onComplete?: () => void; busy?: boolean }) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [serverOnly, setServerOnly] = useState(!value.successPath && value.consentAcknowledged);
  let pathError = '';
  if (!serverOnly && value.successPath.trim()) {
    try { normalizeSuccessPath(value.successPath); } catch (error) { pathError = error instanceof Error ? error.message : 'Enter a signup-complete path.'; }
  }
  const pageReady = serverOnly || (!!value.successPath.trim() && !pathError);
  const prompt = `Enable optional StartupBar signup reporting using the StartupBar loader already installed. Track only genuinely new account creation, never returning login, form submission, pricing views or purchases. Use a dedicated signup-complete path ${value.successPath || '/signup/complete'} only after the account is successfully created. On the same approved website origin, keep the existing loader installed on that page. Integrate with our existing consent manager: after analytics consent is granted set window.startupbarConversionConsent = true before the loader, or dispatch window.dispatchEvent(new CustomEvent('startupbar:conversion-consent', {detail:{granted:true}})). Dispatch granted:false on withdrawal. Do not bypass consent, GPC or Do Not Track. StartupBar stores an anonymous referral token for at most 30 days. Do not send emails, names or account details. If our signup runs on another domain or no dedicated success page exists, use StartupBar's signed server confirmation option instead. Update our privacy notice and test using a StartupBar test referral; tests must not count as real signups.`;
  return <section className="signup-tracking-ui text-foreground" aria-labelledby={`${prefix}-title`}>
    {showToggle && <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border py-5">
      <div className="min-w-0"><h2 id={`${prefix}-title`} className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 shrink-0" />Track referred signups</h2><p className="mt-1 text-xs text-muted-foreground">Optional. Set up now or later.</p></div>
      <Switch aria-label="Enable signup tracking" checked={value.enabled} onCheckedChange={enabled => onChange({ ...value, enabled })} />
    </div>}
    {value.enabled && <div className="tracking-reveal">
      <ol className="mb-7 grid grid-cols-3 border-b border-border" aria-label="Signup tracking setup steps">
        {['Page', 'Connect', 'Privacy'].map((name, index) => <li key={name} className={`tracking-step-marker ${index === step ? 'tracking-step-current' : ''}`} aria-current={index === step ? 'step' : undefined}><span className={`tracking-step-number ${index <= step ? 'tracking-step-reached' : ''}`}>{index < step ? <Check className="h-3 w-3" /> : index + 1}</span><span>{name}</span></li>)}
      </ol>
      <div key={step} className="tracking-step-content tracking-reveal">
        {step === 0 && <>
          <FileCheck2 className="mb-4 h-6 w-6" aria-hidden="true" />
          <h3 className="text-xl font-semibold">Where does a signup finish?</h3>
          <p className="mt-2 text-sm text-muted-foreground">Choose the page people reach after creating an account.</p>
          <div className="mt-6 space-y-2"><Label htmlFor={`${prefix}-path`}>Signup-complete path</Label><Input id={`${prefix}-path`} placeholder="/signup/complete" value={value.successPath} disabled={serverOnly} maxLength={200} aria-invalid={!!pathError} aria-describedby={`${prefix}-path-help`} onChange={e => onChange({ ...value, successPath: e.target.value })} className="h-11 font-mono text-sm" /><p id={`${prefix}-path-help`} className="text-xs text-muted-foreground">On your listed website. Not a login or dashboard page.</p>{pathError && <p role="alert" className="text-xs text-muted-foreground">{pathError}</p>}</div>
          <div className="mt-5 flex items-start gap-3"><Checkbox id={`${prefix}-server`} checked={serverOnly} onCheckedChange={checked => { setServerOnly(checked === true); if (checked === true) onChange({ ...value, successPath: '' }); }} /><Label htmlFor={`${prefix}-server`} className="text-xs font-normal leading-5">No success page? I’ll connect my signup system instead.</Label></div>
        </>}
        {step === 1 && <>
          <Code2 className="mb-4 h-6 w-6" aria-hidden="true" /><h3 className="text-xl font-semibold">Connect your signup flow.</h3>
          <p className="mt-2 text-sm text-muted-foreground">Share the setup with your developer or website AI.</p>
          <ul className="my-6 space-y-3 text-sm">{[serverOnly ? 'Send a signed new-account confirmation' : `Use ${value.successPath}`, 'Connect analytics consent', 'Keep names and emails private'].map(line => <li key={line} className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words">{line}</span></li>)}</ul>
          <Button type="button" variant="outline" className="w-full" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setCopyError(false); window.setTimeout(() => setCopied(false), 2000); } catch { setCopyError(true); } }}>{copied ? <Check /> : <Copy />}{copied ? 'Setup copied' : 'Copy setup instructions'}</Button>
          <p className="mt-3 text-xs text-muted-foreground">Your existing widget stays. Signup confirmation still needs connecting.</p>
          {copyError && <p role="alert" className="mt-2 text-xs text-muted-foreground">Clipboard unavailable. Allow access and try again.</p>}
        </>}
        {step === 2 && <>
          <ShieldCheck className="mb-4 h-6 w-6" aria-hidden="true" /><h3 className="text-xl font-semibold">Private by default.</h3>
          <p className="mt-2 text-sm text-muted-foreground">Anonymous referrals. A 30-day window. No customer details.</p>
          <div className="mt-6 flex items-start gap-3"><Checkbox id={`${prefix}-consent`} checked={value.consentAcknowledged} onCheckedChange={checked => onChange({ ...value, consentAcknowledged: checked === true })} /><Label htmlFor={`${prefix}-consent`} className="text-sm font-normal leading-6">I’ll report only new accounts, update my privacy notice, and require analytics consent for browser tracking.</Label></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Page reports and signed confirmations are counted separately. Neither is an independent audit.</p>
          {!onComplete && value.consentAcknowledged && <p role="status" className="mt-4 flex items-center gap-2 text-sm"><Check className="h-4 w-4" />Setup will be saved with your application.</p>}
        </>}
      </div>
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-5">
        <div>{step > 0 && <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep(step - 1)}><ArrowLeft />Back</Button>}</div>
        {step < 2 ? <Button type="button" disabled={step === 0 && !pageReady} onClick={() => setStep(step + 1)}>Continue<ArrowRight /></Button> : onComplete ? <Button type="button" disabled={busy || !value.consentAcknowledged || !pageReady} onClick={onComplete}>{busy ? <Loader2 className="animate-spin" /> : <Check />}{busy ? 'Saving…' : 'Save setup'}</Button> : <span className="text-xs text-muted-foreground">Optional setup</span>}
      </div>
    </div>}
  </section>;
}
