import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getStartupPage, getStartupPulse } from "@/lib/startup-page.functions";
import { StartupEmbed } from "@/components/StartupEmbed";
import { DashboardLayout } from "@/components/DashboardLayout";

import { StartupFavicon } from "@/components/StartupFavicon";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Quote, Activity, ArrowUpRight, Calendar, User, Pencil, LayoutDashboard, Share2, Check } from "lucide-react";


const pageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["startup-page", slug],
    queryFn: () => getStartupPage({ data: { slug } }),
  });

function StartupPageSkeleton() {
  return (
    <DashboardLayout>
      <div className="-mx-4 -my-6 bg-white text-black sm:-mx-6 sm:-my-8">
        <main className="mx-auto max-w-6xl px-5 pb-8 pt-10 md:pt-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl border border-black/8 bg-black/[0.05]" />
              <div className="min-w-0 flex-1 pt-1">
                <div className="h-9 w-56 animate-pulse rounded-full bg-black/[0.06]" />
                <div className="mt-4 h-3 w-[min(34rem,70vw)] animate-pulse rounded-full bg-black/[0.045]" />
                <div className="mt-2 h-3 w-[min(26rem,60vw)] animate-pulse rounded-full bg-black/[0.035]" />
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-28 animate-pulse rounded-full bg-black/[0.045]" />
                  <div className="h-6 w-36 animate-pulse rounded-full bg-black/[0.035]" />
                </div>
              </div>
            </div>
            <div className="h-11 w-28 animate-pulse rounded-xl bg-black/[0.06]" />
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-black/8 bg-white p-4">
                <div className="h-2.5 w-24 animate-pulse rounded-full bg-black/[0.05]" />
                <div className="mt-4 h-7 w-16 animate-pulse rounded-full bg-black/[0.06]" />
                <div className="mt-2 h-2.5 w-20 animate-pulse rounded-full bg-black/[0.035]" />
              </div>
            ))}
          </div>

          <div className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded-full bg-black/[0.05]" />
              <div className="h-3 w-28 animate-pulse rounded-full bg-black/[0.05]" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div className="flex items-center gap-1.5 border-b border-black/6 bg-black/[0.02] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
                <span className="ml-2 h-3 w-48 animate-pulse rounded-full bg-black/[0.05]" />
              </div>
              <div className="h-[500px] animate-pulse bg-gradient-to-br from-black/[0.035] via-black/[0.015] to-black/[0.05]" />
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-black/8 bg-black/[0.02] p-6 md:p-8">
            <div className="mb-5 h-3 w-24 animate-pulse rounded-full bg-black/[0.05]" />
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
              <div className="flex-1 space-y-2 pt-2">
                <div className="h-3 w-full animate-pulse rounded-full bg-black/[0.045]" />
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-black/[0.035]" />
                <div className="mt-4 h-3 w-40 animate-pulse rounded-full bg-black/[0.04]" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/startup/$slug")({
  pendingMs: 150,
  pendingMinMs: 350,
  pendingComponent: StartupPageSkeleton,
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(pageQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Startup not found — StartupBar" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — StartupBar`;
    const desc = loaderData.description || `${loaderData.name} on StartupBar`;
    const url = `https://startupbar.co/startup/${loaderData.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
    ];
    if (loaderData.logo_url) {
      meta.push({ property: "og:image", content: loaderData.logo_url });
      meta.push({ name: "twitter:image", content: loaderData.logo_url });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-black">Startup not found</h1>
        <p className="mt-2 text-sm text-black/50">This startup may have been removed.</p>
        <Link to="/network" className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
          Explore the network
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Something broke</h1>
        <button onClick={() => reset()} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white">Retry</button>
      </div>
    </div>
  ),
  component: StartupPage,
});

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StartupPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(pageQuery(slug));
  const s = data!;

  const [authState, setAuthState] = useState<{ ready: boolean; userId: string | null }>({ ready: false, userId: null });
  useEffect(() => {
    let cancel = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancel) setAuthState({ ready: true, userId: data.user?.id ?? null });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState({ ready: true, userId: session?.user?.id ?? null });
    });
    return () => { cancel = true; sub.subscription.unsubscribe(); };
  }, []);
  const isSignedIn = !!authState.userId;
  const isOwner = isSignedIn && !!s.user_id && authState.userId === s.user_id;

  const pulseQ = useQuery({
    queryKey: ["startup-pulse", s.id],
    queryFn: () => getStartupPulse({ data: { id: s.id } }),
    initialData: s.pulse,
    refetchInterval: 15_000,
  });

  const joined = new Date(s.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const ctr = s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(1) : "0.0";
  const external = s.website_url.startsWith("http") ? s.website_url : `https://${s.website_url}`;

  return (
    <DashboardLayout>
      <div className="-mx-4 -my-6 sm:-mx-6 sm:-my-8 bg-white text-black">
      <main className="mx-auto max-w-6xl px-4 sm:px-5 pt-8 md:pt-16 pb-8">

        {/* HERO */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 sm:gap-5 min-w-0">
            <div className="h-14 w-14 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-black/[0.02]">
              <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={80} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight break-words" style={{ fontFamily: "var(--font-display)" }}>
                {s.name}
              </h1>
              <p className="mt-2 max-w-xl text-[14px] sm:text-[15px] leading-relaxed text-black/60">{s.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-black/45">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1">
                  <Calendar className="h-3 w-3" /> Joined {joined}
                </span>
                {(pulseQ.data ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {pulseQ.data} visitor{pulseQ.data === 1 ? "" : "s"} in the last 5 min
                  </span>
                )}
              </div>
            </div>
          </div>
          <a href={`/api/public/widget/click?id=${s.id}&source=profile`} target="_blank" rel="noopener noreferrer"
            className="inline-flex w-full md:w-auto justify-center shrink-0 items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/85">
            Visit site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* STATS */}
        <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-5">
          <Stat label="Impressions received" value={fmt(s.impressions)} sub="in others' bars" />
          <Stat label="Impressions contributed" value={fmt(s.impressions_given)} sub="shown from this site" />
          <Stat label="Clicks received" value={fmt(s.clicks)} sub="landings via StartupBar" />
          <Stat label="Clicks contributed" value={fmt(s.clicks_given)} sub="outbound via this site" />
          <Stat label="Network CTR" value={`${ctr}%`} sub="clicks ÷ impressions" />
        </div>

        {/* LIVE EMBED */}
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-black/40" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-black/40">Live preview</h2>
          </div>
          <StartupEmbed startupId={s.id} url={s.website_url} name={s.name} initialBlocked={s.iframe_blocked} />
        </div>

        {/* FOUNDER — always rendered */}
        <FounderSection s={s} />

        {/* REFERRERS */}
        {s.referrers.length > 0 && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-black/40">Traffic partners today</h2>
              <div className="h-px flex-1 bg-black/6" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {s.referrers.map((r) => (
                <Link key={r.startup_id}
                  to="/startup/$slug"
                  params={{ slug: r.slug }}
                  className="group flex items-center gap-3 rounded-xl border border-black/8 bg-white p-4 hover:border-black/20 hover:shadow-sm transition">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/[0.03] border border-black/6">
                    <StartupFavicon url={r.website_url} name={r.name} logoUrl={r.logo_url} size={40} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black">{r.name}</p>
                    <p className="text-xs text-black/45">{r.cnt} referral{r.cnt === 1 ? "" : "s"} today</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-black/20 group-hover:text-black transition" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER CTA — varies by auth state */}
        <StartupPageCta name={s.name} authReady={authState.ready} isSignedIn={isSignedIn} isOwner={isOwner} slug={s.slug} />
      </main>
      </div>
    </DashboardLayout>
  );
}


function StartupPageCta({ name, authReady, isSignedIn, isOwner, slug }: { name: string; authReady: boolean; isSignedIn: boolean; isOwner: boolean; slug: string }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    const url = `${window.location.origin}/startup/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  // Reserve space while auth resolves so the CTA doesn't flash the wrong copy.
  if (!authReady) {
    return <div aria-hidden className="mt-16 h-[220px] rounded-2xl border border-black/6 bg-black/[0.02]" />;
  }

  if (isOwner) {
    return (
      <div className="mt-16 rounded-2xl border border-black/8 bg-gradient-to-br from-black to-black/85 text-white p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">This is your page</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Share {name} with the world
        </h3>
        <p className="mt-2 text-sm text-white/60">Post it on X, LinkedIn, or your launch thread — every visit here counts toward your traffic.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Share2 className="h-3.5 w-3.5" /> Copy page link</>}
          </button>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
            <LayoutDashboard className="h-3.5 w-3.5" /> Open dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="mt-16 rounded-2xl border border-black/8 bg-black text-white p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Enjoying {name}?</p>
        <h3 className="mt-2 text-3xl font-semibold" style={{ fontFamily: '"SF Pro Rounded", ui-rounded, "Nunito", "Quicksand", system-ui, sans-serif' }}>
          Send some traffic their way
        </h3>
        <p className="mt-2 text-sm text-white/60">Share this page with your network, or head to your dashboard to check your own numbers.</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Share2 className="h-3.5 w-3.5" /> Share this page</>}
          </button>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
            <LayoutDashboard className="h-3.5 w-3.5" /> My dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Signed-out: original acquisition CTA
  return (
    <div className="mt-16 rounded-2xl border border-black/8 bg-black text-white p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Want a page like this?</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Join StartupBar
      </h3>
      <p className="mt-2 text-sm text-white/60">Exchange traffic with other founders. Every embed unlocks a public page like {name}'s.</p>
      <Link to="/apply" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
        Apply your startup <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-black">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-black/35">{sub}</p>}
    </div>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FounderSection({ s }: { s: { name: string; user_id: string | null; founder_name: string | null; founder_quote: string | null; founder_avatar_url: string | null; founder_twitter: string | null } }) {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    let cancel = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancel && data.user?.id && s.user_id && data.user.id === s.user_id) setIsOwner(true);
});
    return () => { cancel = true; };
  }, [s.user_id]);

  const hasAny = !!(s.founder_quote || s.founder_name || s.founder_avatar_url || s.founder_twitter);
  const displayName = s.founder_name || (hasAny ? null : `Founder of ${s.name}`);
  const initial = (s.founder_name || s.name).charAt(0).toUpperCase();

  return (
    <div className="mt-10 rounded-2xl border border-black/8 bg-gradient-to-br from-black/[0.02] to-transparent p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
          <User className="h-3.5 w-3.5" /> Founder
        </div>
        {isOwner && (
          <Link to="/account" className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 hover:border-black/25 hover:text-black">
            <Pencil className="h-3 w-3" /> {hasAny ? "Edit your story" : "Add your story"}
          </Link>
        )}
      </div>
      <div className="flex items-start gap-5">
        {s.founder_avatar_url ? (
          <img src={s.founder_avatar_url} alt={s.founder_name || "Founder"} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white shadow" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-black/8 text-lg font-semibold text-black/40">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {s.founder_quote ? (
            <div className="relative">
              <Quote className="absolute -left-1 -top-2 h-5 w-5 text-black/10" />
              <p className="pl-6 text-[17px] italic leading-relaxed text-black/75" style={{ fontFamily: "var(--font-quote)" }}>
                "{s.founder_quote}"
              </p>
            </div>
          ) : (
            <p className="text-[15px] italic leading-relaxed text-black/40">
              The founder hasn't shared their story yet.
            </p>
          )}
          {(displayName || s.founder_twitter) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {displayName && (
                <p className="text-sm font-medium text-black/70">
                  {s.founder_name ? <>— {s.founder_name}<span className="ml-1 font-normal text-black/40">, founder of {s.name}</span></> : <span className="text-black/50">{displayName}</span>}
                </p>
              )}
              {s.founder_twitter && (
                <a
                  href={`https://x.com/${s.founder_twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-black/70 hover:border-black/30 hover:text-black transition-colors"
                >
                  <XLogo className="h-3 w-3" />
                  @{s.founder_twitter}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

