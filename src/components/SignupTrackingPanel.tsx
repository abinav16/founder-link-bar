import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, ExternalLink, KeyRound, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SignupTrackingSetup, emptySignupDraft, type SignupTrackingDraft } from './SignupTrackingSetup';
import { createSignupTest, getSignupSummary, rotateSignupKey, saveSignupTracking } from '@/lib/signup-tracking.functions';
import { cohortConversionRate } from '@/lib/signup-tracking';

export function SignupTrackingPanel({ startupId, range, status }: { startupId: string; range: '24h'|'7d'|'30d'|'all'; status: string }) {
  const queryClient = useQueryClient();
  const getSummary = useServerFn(getSignupSummary);
  const save = useServerFn(saveSignupTracking);
  const test = useServerFn(createSignupTest);
  const rotate = useServerFn(rotateSignupKey);
  const [draft,setDraft] = useState<SignupTrackingDraft>(emptySignupDraft);
  const [dirty,setDirty] = useState(false);
  const [busy,setBusy] = useState(false);
  const [testUrl,setTestUrl] = useState('');
  const [secret,setSecret] = useState('');
  const [confirmRotate,setConfirmRotate] = useState(false);
  const [showServer,setShowServer] = useState(false);
  const [copied,setCopied] = useState(false);
  const {data,error,isPending,refetch} = useQuery({queryKey:['signup-summary',startupId,range],queryFn:()=>getSummary({data:{startupId,since:range==='all'?null:new Date(Date.now()-({'24h':86400000,'7d':7*86400000,'30d':30*86400000}[range])).toISOString()}}),refetchInterval:60000});
  useEffect(()=>{setDirty(false);setDraft(emptySignupDraft);setSecret('');setTestUrl('');setConfirmRotate(false);},[startupId]);
  useEffect(()=>{if(data && !dirty) setDraft({enabled:data.settings?.enabled ?? false,successPath:data.settings?.success_path ?? '',consentAcknowledged:data.settings?.enabled ?? false});},[data,dirty]);
  const refresh=()=>queryClient.invalidateQueries({queryKey:['signup-summary',startupId]});
  const rate=data ? cohortConversionRate(data.cohort_verified,data.referrals):null;
  async function action(work:()=>Promise<void>) {setBusy(true);try{await work();}catch(e){toast.error(e instanceof Error ? e.message : 'Please try again.');}finally{setBusy(false);}}
  return <section className="signup-tracking-ui border-y border-border bg-background px-4 py-6 text-foreground sm:px-6" aria-label="Partner signup results">
    <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Signups from the network</h2><Button variant="ghost" size="icon" title="Refresh signup results" aria-label="Refresh signup results" onClick={()=>void refetch()}><RefreshCw /></Button></div>
    {isPending ? <p role="status" className="mt-4 text-sm text-muted-foreground">Loading signup results…</p> : error ? <div className="mt-4 flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-muted-foreground">Signup reporting is temporarily unavailable. Your widget and traffic stats still work.</p><Button variant="outline" size="sm" onClick={()=>void refetch()}>Try again</Button></div> : data && <>
      <p className="mt-1 text-xs text-muted-foreground">{!data.settings?.enabled ? 'Not enabled' : data.settings.last_server_report_at ? 'Server confirmations received' : data.settings.last_browser_report_at ? 'Success-page reports received' : data.settings.last_test_at ? 'Test received · awaiting real signups' : 'Configured · not yet tested'}{data.settings?.enabled && status!=='approved' ? ' · paused until approved' : ''}</p>
      <dl className="my-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {[['Verified signups',data.verified || (data.settings?.last_server_report_at ? 0 : '—')],['Success-page reports',data.reported || (data.settings?.last_browser_report_at ? 0 : '—')],['Tracked referrals',data.referrals],['Verified referral rate',rate && data.settings?.last_server_report_at ? `${rate}%` : '—']].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs leading-relaxed text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-2xl font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">Signups count on the day reported, within 30 days of a referral. The rate uses referrals clicked in the selected period; recent referrals can still convert. “—” means no confirmation signal yet, not zero signups. Server-confirmed means the partner’s signed signup system reported it, not an independent audit.</p>
      {data.hosts.length>0 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[300px] text-left text-xs"><caption className="mb-3 text-left text-sm font-medium">Referring partners</caption><thead className="text-muted-foreground"><tr><th className="pb-2 font-normal">Partner</th><th className="pb-2 text-right font-normal">Verified</th><th className="pb-2 text-right font-normal">Page reports</th></tr></thead><tbody>{data.hosts.map((host,i)=><tr key={i} className="border-t border-border"><td className="max-w-[180px] break-words py-3 pr-3">{host.name ?? 'StartupBar'}</td><td className="text-right tabular-nums">{host.verified}</td><td className="text-right tabular-nums">{host.reported}</td></tr>)}</tbody></table></div>}
      <SignupTrackingSetup prefix={`tracking-${startupId}`} value={draft} onChange={value=>{setDraft(value);setDirty(true);setTestUrl('');}} />
      <div className="flex flex-wrap gap-3"><Button disabled={busy || !dirty} onClick={()=>void action(async()=>{await save({data:{startupId,...draft}});setDirty(false);toast.success('Signup tracking saved.');await refresh();})}>{busy ? 'Saving…' : 'Save tracking'}</Button><Button variant="outline" disabled={busy || dirty || !data.settings?.enabled || status!=='approved'} onClick={()=>void action(async()=>{const result=await test({data:{startupId}});setTestUrl(result.url);})}>Create test referral</Button></div>
      {testUrl && <div className="mt-4 space-y-2"><Button asChild variant="outline"><a href={testUrl} target="_blank" rel="noopener noreferrer"><ExternalLink />Open test visit</a></Button><p className="text-xs leading-relaxed text-muted-foreground">Grant analytics consent and complete a test signup. Return here and refresh. Test reports are excluded from proof numbers and emails.</p></div>}
      <div className="mt-5 border-t border-border pt-4"><Button variant="ghost" size="sm" onClick={()=>setShowServer(!showServer)}><KeyRound />Signed server confirmation</Button>
        {showServer && <div className="mt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
          <p>Use your signup system’s new-account event. Keep the referral token with that signup and send only an opaque event ID, never names or email addresses. A developer or an automation tool with HMAC support is required.</p>
          <pre className="max-w-full overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-[11px] text-foreground">{`POST https://startupbar.co/api/public/signup/confirm\nContent-Type: application/json\nX-StartupBar-Timestamp: <Unix seconds>\nX-StartupBar-Signature: <hex HMAC-SHA256>\n\n{"startup_id":"${startupId}","referral_token":"<64-character _sbref token>","event_id":"<opaque unique signup event ID>"}\n\nSign: timestamp + "." + exact JSON body\nKey: your private signing key\nRetry: network errors, 429 and 5xx only\nReuse: same event_id; re-sign each retry\nExpiry: 30 days from original click`}</pre>
          {!confirmRotate ? <Button variant="outline" size="sm" disabled={busy || !data.settings?.enabled || dirty} onClick={()=>setConfirmRotate(true)}>Create or replace private key</Button> : <div className="flex flex-wrap items-center gap-3"><span>Replacing the key disconnects any existing integration.</span><Button variant="outline" size="sm" disabled={busy} onClick={()=>void action(async()=>{const result=await rotate({data:{startupId}});setSecret(result.secret);setConfirmRotate(false);})}>Confirm replacement</Button><Button variant="ghost" size="sm" onClick={()=>setConfirmRotate(false)}>Cancel</Button></div>}
          {secret && <div className="flex flex-wrap items-center gap-3"><p>Key ready. Copy it now; it won’t be shown again. Never place it in a page or public script.</p><Button variant="outline" size="sm" onClick={()=>void action(async()=>{await navigator.clipboard.writeText(secret);setCopied(true);setTimeout(()=>setCopied(false),2000);})}>{copied?<Check/>:<Copy/>}{copied?'Copied':'Copy private key'}</Button><Button variant="ghost" size="sm" onClick={()=>setSecret('')}>Dismiss key</Button></div>}
        </div>}
      </div>
    </>}
  </section>;
}