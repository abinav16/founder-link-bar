import { ArrowRight, MousePointer2, UserRoundPlus, Check } from 'lucide-react';

export function SignupTrackingJourney() {
  return <div className="tracking-journey" aria-label="Referral visit, new account, signup report">
    <div className="tracking-journey-line" aria-hidden="true"><span /></div>
    {[{ Icon: MousePointer2, label: 'Referral visit' }, { Icon: UserRoundPlus, label: 'New account' }, { Icon: Check, label: 'Signup report' }].map(({ Icon, label }, index) =>
      <div key={label} className={`tracking-journey-node tracking-journey-node-${index}`}>
        <div className="tracking-journey-icon"><Icon className="h-5 w-5" /></div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {index < 2 && <ArrowRight className="tracking-journey-arrow h-3 w-3 text-muted-foreground" aria-hidden="true" />}
      </div>)}
  </div>;
}