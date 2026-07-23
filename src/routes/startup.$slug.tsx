import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { getStartupPage, getStartupPulse } from "@/lib/startup-page.functions";
import { StartupEmbed } from "@/components/StartupEmbed";
import { StartupFavicon } from "@/components/StartupFavicon";
import { ExternalLink, Quote, Activity, ArrowUpRight, Calendar } from "lucide-react";

const pageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["startup-page", slug],
    queryFn: () => getStartupPage({ data: { slug } }),
  });

export const Route = createFileRoute("/startup/$slug")({
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
    <div className="min-h-screen bg-white text-black">
      <nav className="border-b border-black/6 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-semibold tracking-tight">StartupBar</Link>
          <div className="flex items-center gap-4 text-sm text-black/60">
            <Link to="/network" className="hover:text-black">Network</Link>
            <Link to="/leaderboard" className="hover:text-black">Leaderboard</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        {/* HERO */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-black/[0.02]">
              <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={80} />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
                {s.name}
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-black/60">{s.description}</p>
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
          <a href={external} target="_blank" rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/85">
            Visit site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* FOUNDER */}
        {(s.founder_quote || s.founder_name || s.founder_avatar_url) && (
          <div className="mt-10 rounded-2xl border border-black/8 bg-gradient-to-br from-black/[0.02] to-transparent p-6 md:p-8">
            <div className="flex items-start gap-5">
              {s.founder_avatar_url ? (
                <img src={s.founder_avatar_url} alt={s.founder_name || "Founder"} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white shadow" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-black/10 text-lg font-semibold text-black/40">
                  {(s.founder_name || s.name).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {s.founder_quote && (
                  <div className="relative">
                    <Quote className="absolute -left-1 -top-2 h-5 w-5 text-black/10" />
                    <p className="pl-6 text-[17px] italic leading-relaxed text-black/75" style={{ fontFamily: "var(--font-display)" }}>
                      "{s.founder_quote}"
                    </p>
                  </div>
                )}
                {s.founder_name && (
                  <p className="mt-3 text-sm font-medium text-black/70">— {s.founder_name}<span className="ml-1 font-normal text-black/40">, founder of {s.name}</span></p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Impressions received" value={fmt(s.impressions)} sub="in others' bars" />
          <Stat label="Clicks contributed" value={fmt(s.impressions_given)} sub="shown from this site" />
          <Stat label="Clicks received" value={fmt(s.clicks)} sub="landings via StartupBar" />
          <Stat label="Network CTR" value={`${ctr}%`} sub="clicks ÷ impressions" />
        </div>

        {/* LIVE EMBED */}
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-black/40" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-black/40">Live preview</h2>
          </div>
          <StartupEmbed url={s.website_url} name={s.name} initialBlocked={s.iframe_blocked} />
        </div>

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

        {/* FOOTER CTA */}
        <div className="mt-16 rounded-2xl border border-black/8 bg-black text-white p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Want a page like this?</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Join StartupBar
          </h3>
          <p className="mt-2 text-sm text-white/60">Exchange traffic with other founders. Every embed unlocks a public page like {s.name}'s.</p>
          <Link to="/apply" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
            Apply your startup <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
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
