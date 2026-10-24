import { useState } from 'react';
import { ArrowRight, Check, Settings2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignupTrackingJourney } from './SignupTrackingJourney';
import { SignupTrackingSetup, type SignupTrackingDraft } from './SignupTrackingSetup';

export function ApplySignupTracking({ value, onChange, startupId }: { value: SignupTrackingDraft; onChange: (value: SignupTrackingDraft) => void; startupId: string }) {
  const [editing, setEditing] = useState(false);
  const ready = value.enabled && value.consentAcknowledged;
  const open = () => { onChange({ ...value, enabled: true, successPath: '' }); setEditing(true); };
  const leave = () => { if (!ready) onChange({ ...value, enabled: false }); setEditing(false); };

  return <section className={`signup-tracking-ui tracking-inline-stage mt-8 border-y border-border bg-background px-5 text-foreground sm:px-7 ${editing ? 'tracking-inline-active' : ''}`} aria-label="Track referred signups">
    <div key={editing ? 'setup' : ready ? 'ready' : 'overview'} className="tracking-inline-transition">
      {editing ? <div className="tracking-inline-setup">
        <SignupTrackingSetup compact showToggle={false} prefix="apply-tracking" startupId={startupId} value={value} onChange={onChange} onExit={leave} onComplete={() => setEditing(false)}
          signingKey={<div className="tracking-key"><h3 className="text-sm font-semibold">Your private connection key</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Available in your dashboard after applying. Keep it in server secrets.</p></div>} />
      </div> : ready ? <div className="tracking-overview grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Check className="h-3.5 w-3.5" />Ready to save with your application</div><h2 className="text-2xl font-semibold leading-tight">Finish connecting after you apply.</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Get your private key in the dashboard. Signups appear once your system sends confirmations.</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={open}><Settings2 />Edit setup</Button><Button variant="ghost" size="sm" onClick={() => onChange({ ...value, enabled: false, consentAcknowledged: false })}>Skip for now</Button></div></div><SignupTrackingJourney />
      </div> : <div className="tracking-overview grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Optional · Track referred signups</div><h2 className="text-2xl font-semibold leading-tight">See which visits become signups.</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Connect your signup system. Keep your existing widget.</p><div className="mt-5"><Button onClick={open}>Set up tracking<ArrowRight /></Button></div></div><SignupTrackingJourney />
      </div>}
    </div>
  </section>;
}