import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Flame, Gem, Minus, ShieldCheck, ThumbsUp, Zap, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StartupFavicon } from '@/components/StartupFavicon';
import { getVouchAccess, saveVouch } from '@/lib/profile-insights.functions';
import { momentum, statsShareText, vouchStartups, vouchTags, type ProfileInsights, type VouchTag } from '@/lib/profile-insights';

const tagIcons = { vouch: ThumbsUp, clean_ux: Flame, lightning_fast: Zap, great_concept: Gem };

export function ProfileMomentum({ insights }: { insights: ProfileInsights }) {
  const days = insights.daily.filter(d => d.day_offset <= 6).sort((a,b) => b.day_offset - a.day_offset);
  const total = days.reduce((n,d) => n + Number(d.impressions), 0);
  const clicks = days.reduce((n,d) => n + Number(d.clicks), 0);
  const trend = momentum(insights.daily);
  const max = Math.max(1, ...days.map(d => Number(d.impressions)));
  const points = days.map((d,i) => `${16 + i * 96},${110 - Number(d.impressions) / max * 88}`).join(' ');
  const TrendIcon = trend.change === null || trend.change === 0 ? Minus : trend.change > 0 ? ArrowUpRight : ArrowDownRight;
  const label = trend.change === null ? (trend.current > 0 ? 'Building momentum' : 'Waiting for traffic') : `${trend.change > 0 ? '+' : ''}${trend.change}% vs previous week`;
  return <section className="profile-insights-band mt-10" aria-label="Seven-day traffic">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="profile-kicker">The last seven days</p><h2 className="mt-2 text-xl font-semibold">A little pulse. Real momentum.</h2></div>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><TrendIcon className="size-4" />{label}</span>
    </div>
    <div className="mt-6 grid items-center gap-6 md:grid-cols-[190px_minmax(0,1fr)]">
      <div className="flex gap-8 md:flex-col md:gap-4"><div><p className="text-3xl font-semibold tabular-nums">{total.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">Network impressions</p></div><div><p className="text-xl font-semibold tabular-nums">{clicks.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">Clicks received</p></div></div>
      <div className="min-w-0"><svg viewBox="0 0 608 130" className="profile-sparkline" role="img" aria-label={`Seven-day network impressions: ${days.map(d => `${d.date}: ${d.impressions}`).join(', ')}`}>
        <path d="M16 110H592 M16 66H592 M16 22H592" className="profile-chart-grid" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {days.map((d,i) => <circle key={d.date} cx={16+i*96} cy={110-Number(d.impressions)/max*88} r="4" fill="currentColor"><title>{`${d.date}: ${d.impressions} impressions, ${d.clicks} clicks`}</title></circle>)}
      </svg><div className="flex justify-between gap-1 text-[10px] text-muted-foreground">{days.map(d => <span key={d.date} title={`${d.date}: ${d.impressions} impressions`}>{d.day_offset === 0 ? 'Today' : new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>)}</div>
      <p className="mt-3 text-[11px] text-muted-foreground">UTC · Today is still in progress. Momentum compares completed weeks.</p></div>
    </div>
  </section>;
}

export function FounderVouches({ id, insights, userId, isOwner }: { id: string; insights: ProfileInsights; userId: string | null; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const accessFn = useServerFn(getVouchAccess);
  const saveFn = useServerFn(saveVouch);
  const access = useQuery({ queryKey: ['vouch-access', id, userId], queryFn: () => accessFn({ data: { id } }), enabled: !!userId });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function choose(tag: VouchTag) {
    setBusy(true); setError('');
    try {
      await saveFn({ data: { id, tag: access.data?.tag === tag ? null : tag } });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['startup-page'] }), queryClient.invalidateQueries({ queryKey: ['vouch-access', id] })]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your vouch. Try again.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-insights-band mt-10" aria-label="Founder vouches">
    <div className="flex items-start justify-between gap-4"><div><p className="profile-kicker flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Founder to founder</p><h2 className="mt-2 text-xl font-semibold">People who believe in this.</h2></div><div className="text-right"><p className="text-3xl font-semibold tabular-nums">{insights.vouchCount}</p><p className="text-xs text-muted-foreground">founder {insights.vouchCount === 1 ? 'vouch' : 'vouches'}</p></div></div>
    <div className="mt-5 flex flex-wrap gap-2">{vouchTags.map(tag => {
      const Icon = tagIcons[tag.value]; const selected = access.data?.tag === tag.value;
      return <Button key={tag.value} variant={selected ? 'default' : 'outline'} disabled={!access.data?.eligible || busy} aria-pressed={selected} onClick={() => choose(tag.value)} className="h-10 shadow-none"><Icon />{tag.label}<span className="ml-1 tabular-nums">{insights.vouchTags[tag.value] ?? 0}</span>{selected && <Check />}</Button>;
    })}</div>
    {!userId ? <Button asChild variant="link" className="mt-2 px-0"><Link to="/auth">Sign in to vouch</Link></Button> : isOwner ? <p className="mt-3 text-xs text-muted-foreground">Vouches come from other approved founders in the network.</p> : access.isError ? <Button variant="link" className="mt-2 px-0" onClick={() => access.refetch()}>Retry eligibility check</Button> : access.data && !access.data.eligible ? <p className="mt-3 text-xs text-muted-foreground">An approved startup is needed to give a founder vouch.</p> : <p className="mt-3 text-xs text-muted-foreground">{access.data?.tag ? 'Your vouch is saved. Select it again to remove it.' : 'One vouch per founder. Choose what stands out.'}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {insights.vouches.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2">{insights.vouches.map(v => {
      const startups = vouchStartups(v);
      return <div key={v.slug + v.founder_name} className="flex min-w-0 items-start gap-3 text-sm" aria-label={`Vouch from ${v.founder_name}`}>
        <div className="flex max-w-28 shrink-0 flex-wrap items-center gap-y-1 -space-x-3" aria-label={`${v.founder_name}'s startup logos`}>
          {startups.map(s => <Link key={s.slug} to="/startup/$slug" params={{ slug: s.slug }} title={s.name} aria-label={`${s.name} profile`} className="relative size-10 shrink-0 overflow-hidden rounded-full border-2 border-background bg-background ring-1 ring-border transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring"><StartupFavicon name={s.name} url={s.website_url} logoUrl={s.logo_url} size={36} className="rounded-full" /></Link>)}
        </div>
        <div className="min-w-0 flex-1"><p className="font-medium break-words">{v.founder_name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{startups.map((s, i) => <span key={s.slug}>{i > 0 && <span aria-hidden="true"> · </span>}<Link to="/startup/$slug" params={{ slug: s.slug }} className="break-words underline-offset-2 hover:text-foreground hover:underline">{s.name}</Link></span>)}</p><p className="mt-1 text-xs text-muted-foreground">{vouchTags.find(t => t.value === v.tag)?.label}</p></div>
      </div>;
    })}</div> : <p className="mt-5 text-sm text-muted-foreground">No vouches yet. The first one starts the story.</p>}
  </section>;
}

export function RelatedStartups({ insights }: { insights: ProfileInsights }) {
  if (!insights.related.length) return null;
  return <section className="mt-12" aria-label="Related startups"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="profile-kicker">Keep discovering</p><h2 className="mt-2 text-xl font-semibold">More from the founder network.</h2></div><Button asChild variant="link" className="px-0"><Link to="/network">Explore all <ArrowUpRight /></Link></Button></div><div className="grid gap-3 sm:grid-cols-3">{insights.related.map(s => <Link key={s.id} to="/startup/$slug" params={{ slug: s.slug }} className="profile-discovery-card group"><div className="flex items-start justify-between gap-3"><div className="size-11 overflow-hidden rounded-md border border-border"><StartupFavicon name={s.name} url={s.website_url} logoUrl={s.logo_url} size={44} /></div><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><h3 className="mt-4 text-base font-semibold break-words">{s.name}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground break-words">{s.description}</p></Link>)}</div></section>;
}

export function OwnerStatsShare({ name, slug, clicks, impressions }: { name: string; slug: string; clicks: number; impressions: number }) {
  const [error, setError] = useState('');
  const text = statsShareText(name, clicks, impressions, slug);
  function download() {
    const canvas = document.createElement('canvas'); canvas.width=1200; canvas.height=630;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    ctx.fillStyle = css.getPropertyValue('--profile-share-paper').trim(); ctx.fillRect(0,0,1200,630);
    ctx.fillStyle = css.getPropertyValue('--profile-share-ink').trim();
    ctx.font='600 28px system-ui'; ctx.fillText('StartupBar / Founder traction',70,90);
    let size=60; while(size>22) { ctx.font=`600 ${size}px system-ui`; if(ctx.measureText(name).width<=1060) break; size-=2; }
    ctx.fillText(name,70,205,1060);
    ctx.font='600 86px system-ui'; ctx.fillText(clicks.toLocaleString('en-US'),70,350); ctx.fillText(impressions.toLocaleString('en-US'),610,350);
    ctx.font='24px system-ui'; ctx.fillText('Clicks received',70,397); ctx.fillText('Network impressions',610,397);
    ctx.font='22px system-ui'; ctx.fillText(`startupbar.co/startup/${slug}`,70,550,1060);
    const a=document.createElement('a'); a.download=`${slug}-startupbar-stats.png`; a.href=canvas.toDataURL('image/png'); a.click();
  }
  return <section className="profile-insights-band mt-12" aria-label="Share your stats"><p className="profile-kicker">Your founder moment</p><h2 className="mt-2 text-xl font-semibold">Traction worth sharing.</h2><div className="profile-share-preview mt-5"><p className="text-xs font-medium">StartupBar / Founder traction</p><h3 className="mt-5 text-2xl font-semibold break-words">{name}</h3><div className="mt-5 grid grid-cols-2 gap-5"><div><p className="text-3xl font-semibold tabular-nums">{clicks.toLocaleString()}</p><p className="mt-1 text-xs">Clicks received</p></div><div><p className="text-3xl font-semibold tabular-nums">{impressions.toLocaleString()}</p><p className="mt-1 text-xs">Network impressions</p></div></div><p className="mt-6 text-xs break-all">startupbar.co/startup/{slug}</p></div><div className="mt-4 flex flex-wrap gap-2"><Button asChild><a href={`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><Share2 />Share stats to X<ArrowUpRight /></a></Button><Button variant="outline" onClick={() => { try { download(); } catch { setError('Could not create your image. Please try again.'); } }}><Download />Download card</Button></div>{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</section>;
}