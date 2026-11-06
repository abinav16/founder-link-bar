import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, ChevronsRight, Globe, Info, Menu, Star, Trophy, Zap } from "lucide-react";
import { StartupFavicon } from "@/components/StartupFavicon";

/**
 * Faithful miniatures of the live network and leaderboard pages, rendered at
 * real page widths and scaled down to fit the device screens.
 */

export type MockYou = { name: string; desc: string; url: string };
export type MockPage = "network" | "list" | "leaderboard";


/** Renders children at a fixed design width, scaled to the container. */
export function Scaled({ width, children }: { width: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ s: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setBox({ s: el.clientWidth / width, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div
        style={{ width, height: box.s ? box.h / box.s : undefined, transform: `scale(${box.s})`, transformOrigin: "0 0", visibility: box.s ? "visible" : "hidden" }}
        className="overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}

/** Neutral placeholder line: other startups stay blank so yours stands out. */
function Bar({ w, h = 8, className = "" }: { w: string | number; h?: number; className?: string }) {
  return <span aria-hidden className={`block shrink-0 rounded-full bg-muted ${className}`} style={{ width: w, height: h }} />;
}

function GhostBox({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div aria-hidden className={`rounded-xl border border-border bg-card ${className}`}>{children}</div>;
}

function Logo({ small }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`${small ? "h-2 w-6" : "h-2.5 w-7"} rounded-full bg-foreground`} />
      <span className={`${small ? "text-[18px]" : "text-[22px]"} font-semibold text-foreground`}>StartupBar</span>
    </span>
  );
}

function DesktopHeader({ page }: { page: MockPage }) {
  const active = page === "leaderboard" ? "Leaderboard" : "Network";
  return (
    <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-border bg-card px-14">
      <Logo />
      <nav className="flex items-center gap-10 text-[15px] font-medium text-muted-foreground">
        {["Network", "Leaderboard", "StartupBid", "Pricing", "Apply"].map((l) => (
          <span key={l} className={l === active ? "text-foreground underline decoration-foreground/30 underline-offset-8" : ""}>{l}</span>
        ))}
      </nav>
      <span className="flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[15px] font-medium text-background">Dashboard <ChevronsRight className="h-4 w-4" /></span>
    </div>
  );
}

function RailCard({ name, founder, desc, url, logo, index, you }: { name: string; founder: string; desc: string; url: string; logo?: string | null; index: number; you?: boolean }) {
  return (
    <article className={`featured-glass relative flex min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border p-3 text-featured-text ${you ? "mk-you" : ""}`}>
      <div className="mb-2 flex items-center justify-between text-[9px] font-medium text-featured-gold">
        <span>Featured</span>
        <span className="font-mono text-featured-muted/60">0{index}</span>
      </div>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-featured-gold/20 bg-featured-surface">
          <StartupFavicon url={url} name={name} logoUrl={logo} size={26} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold leading-tight">{name}</p>
          <p className="mt-1 truncate text-[10px] text-featured-muted">{founder}</p>
        </div>
      </div>
      <p className="my-2 line-clamp-3 text-[11px] leading-[1.5] text-featured-muted">{desc}</p>
      <div className="flex items-center justify-between border-t border-featured-text/10 pt-2">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-featured-gold">Visit site <ArrowUpRight className="h-3.5 w-3.5" /></span>
        <span className="text-[10px] text-featured-muted">View profile</span>
      </div>
    </article>
  );
}

function EmptySlot() {
  return (
    <GhostBox className="flex min-h-[80px] flex-1 flex-col justify-center gap-2.5 p-3">
      <span className="flex items-center gap-2"><span className="h-8 w-8 rounded-lg bg-muted" /><Bar w="55%" /></span>
      <Bar w="85%" h={6} /><Bar w="65%" h={6} />
    </GhostBox>
  );
}

function Rail({ side, you }: { side: "left" | "right"; you: MockYou }) {
  const idx = side === "left" ? [1, 2, 3, 4] : [5, 6, 7, 8];
  return (
    <aside className="flex min-h-0 flex-col gap-2.5 overflow-hidden pb-4">
      {idx.map((i) =>
        i === 1 ? <RailCard key={i} you index={1} name={you.name} founder="You" desc={you.desc} url={you.url} /> : <EmptySlot key={i} />,
      )}
    </aside>
  );
}

function GlobePill({ you, compact }: { you: MockYou; compact?: boolean }) {
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-full border border-border bg-muted/60 ${compact ? "h-[110px]" : "h-[180px]"}`}>
      <span className="mk-you absolute bottom-[22%] right-[16%] grid h-9 w-9 place-items-center rounded-full border-2 border-featured-gold bg-featured-surface">
        <StartupFavicon url={you.url} name={you.name} size={22} />
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-medium uppercase tracking-[0.25em] text-muted-foreground">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function GridCard({ name, founder, cat, desc, url, you, impressions, clicks }: { name: string; founder: string; cat: string; desc: string; url: string; you?: boolean; impressions: string; clicks: number }) {
  return (
    <div className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5 ${you ? "sb-sponsored mk-you text-featured-text" : "border-border bg-card"}`}>
      <div className="flex items-start gap-2">
        <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${you ? "border-featured-text/15 bg-featured-surface" : "border-border bg-card"}`}>
          <StartupFavicon url={url} name={name} size={30} />
          {you && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border border-featured-gold/40 bg-featured-surface text-featured-gold"><Star className="h-2.5 w-2.5 fill-current" /></span>}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{name}</p>
          <p className={`mt-1 truncate text-[12px] ${you ? "text-featured-muted" : "text-muted-foreground"}`}>{founder}</p>
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-full ${you ? "bg-featured-gold text-featured-surface" : "bg-foreground text-background"}`}><ArrowRight className="h-4 w-4" /></span>
      </div>
      <span className={`self-start rounded-md border px-2 py-0.5 text-[10px] font-medium ${you ? "border-featured-text/15 text-featured-muted" : "border-border bg-muted text-muted-foreground"}`}>{cat}</span>
      <p className={`line-clamp-2 text-[13px] leading-relaxed ${you ? "text-featured-muted" : "text-muted-foreground"}`}>{desc}</p>
      <div className={`grid grid-cols-3 rounded-xl border text-center ${you ? "border-featured-text/15" : "border-border"}`}>
        {[["Joined", you ? "Today" : "4mo ago"], ["Impressions", impressions], ["Clicks", String(clicks)]].map(([l, v]) => (
          <div key={l} className="py-2">
            <p className={`text-[8px] font-semibold uppercase tracking-[0.15em] ${you ? "text-featured-muted" : "text-muted-foreground"}`}>{l}</p>
            <p className="text-[13px] font-medium">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GhostCard() {
  return (
    <GhostBox className="flex flex-col gap-3 rounded-2xl p-5">
      <span className="flex items-center gap-2"><span className="h-10 w-10 rounded-xl bg-muted" /><span className="flex flex-1 flex-col gap-1.5"><Bar w="60%" h={10} /><Bar w="35%" h={6} /></span></span>
      <Bar w={64} h={14} className="rounded-md" />
      <Bar w="90%" h={7} /><Bar w="70%" h={7} />
      <span className="h-12 rounded-xl border border-border" />
    </GhostBox>
  );
}

function GhostRow({ mobile }: { mobile?: boolean }) {
  return (
    <div aria-hidden className="flex items-center gap-3 border-b border-border py-4">
      <span className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
      <span className="flex flex-1 flex-col gap-2"><Bar w="35%" h={9} /><Bar w={mobile ? "75%" : "55%"} h={6} /></span>
      {!mobile && <Bar w={180} h={9} />}
    </div>
  );
}

function GhostBoardRow({ compact }: { compact?: boolean }) {
  return (
    <GhostBox className={`flex items-center gap-3 px-4 ${compact ? "py-3" : "py-4"}`}>
      <Bar w={14} h={8} />
      <span className="h-9 w-9 shrink-0 rounded-full bg-muted" />
      <span className="flex flex-1 flex-col gap-2"><Bar w="40%" h={9} /><Bar w="65%" h={6} /></span>
      {!compact && <Bar w={160} h={9} />}
    </GhostBox>
  );
}

function ListRow({ name, founder, cat, desc, url, you, impressions, clicks, mobile }: { name: string; founder: string; cat: string; desc: string; url: string; you?: boolean; impressions: string; clicks: number; mobile?: boolean }) {
  return (
    <div className={`relative overflow-hidden py-4 ${you ? "sb-featured-row mk-you my-1 rounded-xl border px-3" : "border-b border-border"}`}>
      <div className="relative z-10 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-card">
          <StartupFavicon url={url} name={name} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{name}</span>
            {you && <span className="shrink-0 rounded-full bg-featured-edge px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-featured-surface">Featured</span>}
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Globe className="h-3 w-3" /> {mobile ? "Visit" : "Visit site"} <ArrowUpRight className="h-2.5 w-2.5" />
            </span>
          </div>
          <p className="mt-1.5 truncate text-[12px] text-muted-foreground">{founder}</p>
          <span className="mt-2 inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{cat}</span>
          <p className="mt-2 truncate text-[13px] text-muted-foreground">{desc}</p>
        </div>
        {!mobile && (
          <div className="flex shrink-0 items-center gap-12 pt-1 text-[14px] font-semibold tabular-nums text-foreground">
            <span>{you ? "Today" : "1mo ago"}</span><span>{impressions}</span><span className="w-6 text-right">{clicks}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background"><ArrowRight className="h-4 w-4" /></span>
          </div>
        )}
      </div>
    </div>
  );
}

function Top3({ you, compact }: { you: MockYou; compact?: boolean }) {
  const pad = compact ? "p-2.5" : "p-4";
  const num = compact ? "text-[18px]" : "text-[24px]";
  const nm = compact ? "text-[11px]" : "text-[14px]";
  return (
    <div className={`grid grid-cols-3 items-end ${compact ? "gap-1.5" : "gap-3"}`}>
      <div className={`featured-glass mk-you relative flex flex-col items-center rounded-2xl border text-center text-featured-text ${pad}`}>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-featured-gold">Featured</span>
        <span className="mt-1 grid h-8 w-8 place-items-center rounded-full border border-featured-text/15"><StartupFavicon url={you.url} name={you.name} size={20} /></span>
        <p className={`mt-1.5 w-full truncate font-semibold ${nm}`}>{you.name}</p>
        <p className={`${num} font-semibold`}>105</p>
        <p className="text-[8px] uppercase tracking-[0.15em] text-featured-muted">Impressions today</p>
      </div>
      {[0, 1].map((k) => (
        <GhostBox key={k} className={`flex flex-col items-center gap-2 rounded-2xl ${compact ? "p-3" : "p-5"}`}>
          <span className="h-8 w-8 rounded-full bg-muted" />
          <Bar w="60%" h={8} /><Bar w="35%" h={14} /><Bar w="70%" h={5} />
        </GhostBox>
      ))}
    </div>
  );
}

function BoardRow({ rank, name, desc, url, impr, clicks, ctr, you, compact }: { rank: string; name: string; desc: string; url: string; impr: number; clicks: number; ctr: string; you?: boolean; compact?: boolean }) {
  return (
    <div className={`relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 ${compact ? "py-2.5" : "py-3.5"} ${you ? "sb-featured-row mk-you" : "border-border bg-card"}`}>
      <span className="relative z-10 w-5 text-[12px]">{rank}</span>
      <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card"><StartupFavicon url={url} name={name} size={22} /></span>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-foreground">{name}</span>
          {you && <span className="shrink-0 rounded-full bg-featured-edge px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-featured-surface">Featured</span>}
        </div>
        <p className="truncate text-[12px] text-muted-foreground">{desc}</p>
      </div>
      {!compact && (
        <div className="relative z-10 flex items-end gap-[3px]">
          {[4, 7, 5, 9, 6, 12, 8, 16, 10, 20].map((h, i) => <span key={i} className="w-[2px] bg-foreground/60" style={{ height: h }} />)}
        </div>
      )}
      <span className="relative z-10 w-12 text-right text-[16px] font-semibold tabular-nums text-foreground">{impr}</span>
      {!compact && <span className="relative z-10 w-12 text-right text-[16px] font-semibold tabular-nums text-foreground">{clicks}</span>}
      {!compact && <span className="relative z-10 w-14 text-right text-[16px] font-semibold tabular-nums text-foreground">{ctr}</span>}
    </div>
  );
}

function LeaderboardBody({ you, compact }: { you: MockYou; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Trophy className="h-3.5 w-3.5" /> Network</p>
          <p className="text-[30px] font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>Leaderboard</p>
        </div>
        {!compact && (
          <div className="flex text-[14px]">
            <span className="flex items-center gap-2 border-b-2 border-foreground px-6 pb-3 font-semibold text-foreground"><Trophy className="h-4 w-4" /> Most Seen</span>
            <span className="flex items-center gap-2 border-b border-border px-6 pb-3 text-muted-foreground"><Zap className="h-4 w-4" /> Top Contributors</span>
          </div>
        )}
      </div>
      <div className="flex gap-2 text-[13px]">
        <span className="rounded-full bg-foreground px-3.5 py-1.5 text-background">Today</span>
        <span className="rounded-full border border-border px-3.5 py-1.5 text-muted-foreground">This week</span>
        <span className="rounded-full border border-border px-3.5 py-1.5 text-muted-foreground">All time</span>
      </div>
      <div className={compact ? "" : "grid grid-cols-[1.9fr_1fr] gap-4"}>
        <Top3 you={you} compact={compact} />
        {!compact && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border p-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3"><Bar w="40%" h={5} className="bg-border" /><Bar w="55%" h={14} className="bg-border" /></div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <GhostBoardRow compact={compact} />
        <BoardRow compact={compact} you rank="2" name={you.name} desc={you.desc} url={you.url} impr={105} clicks={4} ctr="3.8%" />
        <GhostBoardRow compact={compact} />
        <GhostBoardRow compact={compact} />
      </div>
    </div>
  );
}

/** Desktop page at 1280px. */
export function DesktopNetworkMock({ page, you }: { page: MockPage; you: MockYou }) {
  const host = page === "leaderboard" ? "startupbar.co/leaderboard" : "startupbar.co/network";
  return (
    <Scaled width={1280}>
      <div className="flex h-full flex-col bg-background font-sans text-foreground">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-muted px-4 text-[12px] text-muted-foreground">
          <i className="h-2.5 w-2.5 rounded-full bg-foreground/15" /><i className="h-2.5 w-2.5 rounded-full bg-foreground/15" /><i className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="ml-3 rounded-md bg-card px-3 py-0.5">{host}</span>
        </div>
        <DesktopHeader page={page} />
        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_220px] gap-6 px-5 pt-4">
          <Rail side="left" you={you} />
          <main className="min-h-0 overflow-hidden">
            {page === "network" && (
              <div className="space-y-6">
                <GlobePill you={you} />
                <SectionLabel>Trending · last 24h</SectionLabel>
                <div className="grid grid-cols-3 gap-4">
                  <GridCard you name={you.name} founder="You" cat="Featured" desc={you.desc} url={you.url} impressions="1.2K" clicks={42} />
                  <GhostCard /><GhostCard />
                </div>
              </div>
            )}
            {page === "list" && (
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  <span>All startups</span>
                  <span className="flex gap-12 pr-14"><span>Joined</span><span>Impr.</span><span>Clicks</span></span>
                </div>
                <GhostRow /><GhostRow />
                <ListRow you name={you.name} founder="You" cat="Featured" desc={you.desc} url={you.url} impressions="1.2K" clicks={42} />
                <GhostRow /><GhostRow /><GhostRow />
              </div>
            )}
            {page === "leaderboard" && <LeaderboardBody you={you} />}
          </main>
          <Rail side="right" you={you} />
        </div>
      </div>
    </Scaled>
  );
}

/** Mobile page at 390px: compact featured banner replaces the rails. */
export function MobileNetworkMock({ page, you }: { page: MockPage; you: MockYou }) {
  return (
    <Scaled width={390}>
      <div className="flex h-full flex-col bg-background font-sans text-foreground">
        <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-border bg-card px-5">
          <Logo small />
          <Menu className="h-5 w-5" />
        </div>
        <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-border bg-background px-4 py-2">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground"><Info className="h-4 w-4" /></span>
          <div className="flex min-w-0 gap-2 overflow-hidden">
            {[{ name: you.name, url: you.url, logo: null as string | null, you: true }].map((c, i) => (
              <span key={i} className={`featured-glass relative flex h-11 shrink-0 items-center gap-2.5 overflow-hidden rounded-lg border px-3 ${c.you ? "mk-you" : ""}`}>
                <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-md bg-featured-surface"><StartupFavicon url={c.url} name={c.name} logoUrl={c.logo} size={18} /></span>
                <span className="max-w-[8rem] truncate text-[13px] font-semibold text-featured-text">{c.name}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-featured-gold" />
              </span>
            ))}
            <span aria-hidden className="h-11 w-28 shrink-0 rounded-lg border border-border bg-card" />
            <span aria-hidden className="h-11 w-28 shrink-0 rounded-lg border border-border bg-card" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4 pt-4">
          {page === "network" && (
            <div className="space-y-4">
              <GlobePill you={you} compact />
              <SectionLabel>Trending</SectionLabel>
              <GridCard you name={you.name} founder="You" cat="Featured" desc={you.desc} url={you.url} impressions="1.2K" clicks={42} />
              <GhostCard />
            </div>
          )}
          {page === "list" && (
            <div>
              <GhostRow mobile />
              <ListRow mobile you name={you.name} founder="You" cat="Featured" desc={you.desc} url={you.url} impressions="" clicks={0} />
              <GhostRow mobile /><GhostRow mobile /><GhostRow mobile />
            </div>
          )}
          {page === "leaderboard" && <LeaderboardBody you={you} compact />}
        </div>
      </div>
    </Scaled>
  );
}
