import { useState, type ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowRight, ArrowLeft, ShieldCheck, Code2, Loader2 } from 'lucide-react';
import { signupConnectionInstructions } from '@/lib/signup-connection-instructions';

export interface SignupTrackingDraft { enabled: boolean; successPath: string; consentAcknowledged: boolean }
export const emptySignupDraft: SignupTrackingDraft = { enabled: false, successPath: '', consentAcknowledged: false };

export function SignupTrackingSetup({ value, onChange, prefix = 'signup-tracking', showToggle = true, onComplete, busy = false, startupId, signingKey, compact = false }: { value: SignupTrackingDraft; onChange: (value: SignupTrackingDraft) => void; prefix?: string; showToggle?: boolean; onComplete?: () => void; busy?: boolean; startupId?: string; signingKey?: ReactNode; compact?: boolean }) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const prompt = signupConnectionInstructions(startupId);
  const markers = <ol className={compact ? 'tracking-step-dots' : 'mb-7 grid grid-cols-2 border-b border-border'} aria-label="Signup tracking setup steps">
    {['Connect', 'Review & save'].map((name, index) => <li key={name} className={`tracking-step-marker ${index === step ? 'tracking-step-current' : ''}`} aria-current={index === step ? 'step' : undefined}><span className={`tracking-step-number ${index <= step ? 'tracking-step-reached' : ''}`}>{index < step ? <Check className="h-3 w-3" /> : index + 1}</span><span>{name}</span></li>)}
  </ol>;
  return <section className={`signup-tracking-ui text-foreground ${compact ? 'tracking-compact-setup' : ''}`} aria-label="Signup tracking setup">
    {showToggle && <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border py-5">
      <div className="min-w-0"><h2 id={`${prefix}-title`} className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 shrink-0" />Track referred signups</h2><p className="mt-1 text-xs text-muted-foreground">Optional. Set up now or later.</p></div>
      <Switch aria-label="Enable signup tracking" checked={value.enabled} onCheckedChange={enabled => onChange({ ...value, enabled, successPath: '' })} />
    </div>}
    {value.enabled && <div className="tracking-setup-frame">
      {!compact && markers}
      <div key={`${step}-${showInstructions}`} className="tracking-step-content tracking-reveal" tabIndex={-1}>
        {step === 0 && <>
          {compact ? showInstructions ? <div className="tracking-instructions-view"><Button type="button" variant="ghost" size="sm" onClick={() => setShowInstructions(false)}><ArrowLeft />Back to connection</Button><pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5">{prompt}</pre></div> : <div className="tracking-connect-grid"><div className="min-w-0"><h3 className="text-lg font-semibold">Connect your signup flow.</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Paste these instructions into your website AI or send them to your developer.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? <Check /> : <Copy />}{copied ? 'Setup copied' : 'Copy instructions'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setShowInstructions(true)}>View</Button></div>{copyError && <p role="alert" className="mt-2 text-xs text-muted-foreground">Can’t copy. Choose View to copy manually.</p>}</div>{signingKey}</div> : <>
          <Code2 className="mb-4 h-6 w-6" aria-hidden="true" /><h3 className="text-xl font-semibold">Connect your signup flow.</h3>
          <p className="mt-2 text-sm text-muted-foreground">Share the setup with your developer or website AI.</p>
          <ul className="my-6 space-y-3 text-sm">{['Count new accounts, not page visits', 'Works even when signups go to a dashboard', 'No names, emails or passwords shared'].map(line => <li key={line} className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words">{line}</span></li>)}</ul>
          <Button type="button" variant="outline" className="w-full" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setCopyError(false); window.setTimeout(() => setCopied(false), 2000); } catch { setCopyError(true); } }}>{copied ? <Check /> : <Copy />}{copied ? 'Setup copied' : 'Copy setup instructions'}</Button>
          <p className="mt-3 text-xs text-muted-foreground">Your existing widget stays. Signup confirmation still needs connecting.</p>
          {copyError && <p role="alert" className="mt-2 text-xs text-muted-foreground">Clipboard unavailable. Allow access and try again.</p>}
          {signingKey ?? <p className="mt-5 text-xs leading-5 text-muted-foreground">Your private connection key will be available in your dashboard after applying.</p>}
          <details className="mt-5 text-xs"><summary className="cursor-pointer font-medium">View the same instructions</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-4 font-mono text-xs leading-5">{prompt}</pre></details>
          </>}
        </>}
        {step === 1 && <>
          <ShieldCheck className="tracking-review-icon mb-4 h-6 w-6" aria-hidden="true" /><h3 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold`}>Private by default.</h3>
          <p className={`${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'} text-muted-foreground`}>Anonymous referrals. A 30-day window. No customer details.</p>
          <div className="mt-6 flex items-start gap-3"><Checkbox id={`${prefix}-consent`} checked={value.consentAcknowledged} onCheckedChange={checked => onChange({ ...value, consentAcknowledged: checked === true })} /><Label htmlFor={`${prefix}-consent`} className={`${compact ? 'leading-5' : 'leading-6'} text-sm font-normal`}>I’ll report only new accounts, update my privacy notice, and require analytics consent for browser tracking.</Label></div>
          {!compact && <p className="mt-4 text-xs leading-5 text-muted-foreground">Saving enables tracking. Results appear only after your signup system sends confirmations.</p>}
          {!onComplete && value.consentAcknowledged && <p role="status" className="mt-4 flex items-center gap-2 text-sm"><Check className="h-4 w-4" />Setup will be saved with your application.</p>}
        </>}
      </div>
      <div className="tracking-setup-footer mt-7 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-5">
        <div className="flex min-w-0 items-center gap-2">{step > 0 && <Button type="button" variant="ghost" size={compact ? 'sm' : 'default'} disabled={busy} onClick={() => setStep(step - 1)}><ArrowLeft />Back</Button>}{compact && markers}</div>
        {step === 0 ? <Button type="button" size={compact ? 'sm' : 'default'} disabled={busy} onClick={() => { onChange({ ...value, successPath: '' }); setShowInstructions(false); setStep(1); }}>Continue<ArrowRight /></Button> : onComplete ? <Button type="button" size={compact ? 'sm' : 'default'} disabled={busy || !value.consentAcknowledged} onClick={onComplete}>{busy ? <Loader2 className="animate-spin" /> : <Check />}{busy ? 'Saving…' : 'Save setup'}</Button> : <span className="text-xs text-muted-foreground">Optional setup</span>}
      </div>
    </div>}
  </section>;
}
