import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Mail, Sparkles, Trophy } from "lucide-react";
import type { CheckoutPlan } from "@/lib/checkout-plans";
import { findPack } from "@/lib/checkout-plans";
import { WidgetBarMock } from "./WidgetBarMock";
import { useAudience } from "./PlanPicker";

/**
 * Sticky rail that never drifts: its sticky offset equals its natural position,
 * so scrolling the form never moves the stage.
 */
export function StageRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;
      const header = document.querySelector(".site-header") as HTMLElement | null;
      const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      const natural = parent.getBoundingClientRect().top + window.scrollY;
      setTop(Math.max(Math.round(natural), Math.round(headerBottom + 12)));
    };
    measure();
    const t = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", measure); };
  }, []);
  return (
    <div
      ref={ref}
      className="apply-stage-rail"
      style={top != null ? { top, height: `calc(100dvh - ${top + 16}px)` } : undefined}
    >
      {children}
    </div>
  );
}

type SlideId = "site" | "home" | "network" | "leaderboard" | "digest";
const SLIDE_LABEL: Record<SlideId, string> = {
  site: "Your site", home: "Homepage spot", network: "Network", leaderboard: "Leaderboard", digest: "Sunday digest",
};
const OTHERS = [
  { n: "Lumen Notes", d: "Notes that link themselves" },
  { n: "Shipfast CRM", d: "Pipeline for tiny teams" },
  { n: "Pixel Forge", d: "Icons from a single prompt" },
  { n: "Quietly", d: "Focus timer for builders" },
  { n: "Formcraft", d: "Forms people finish" },
];

export function DeviceStage({
  laptop, name, desc, url, placement, plan,
}: {
  laptop: ReactNode; name: string; desc: string; url: string; placement: "top" | "bottom"; plan: CheckoutPlan;
}) {
  const featured = plan.base === "clicks";
  const supporter = plan.base === "supporter";
  const newsletter = !!plan.newsletter && !supporter;
  const pack = findPack(plan.clicks);
  const audience = useAudience().data ?? 0;
  const displayName = name.trim() || "Your Startup";
  const displayDesc = desc.trim() || "Your one liner goes here";
  const favicon = url ? `https://www.google.com/s2/favicons?domain=${url}&sz=64` : null;

  const slides = useMemo<SlideId[]>(() => {
    const s: SlideId[] = ["site"];
    if (featured) s.push("home", "network", "leaderboard");
    if (newsletter) s.push("digest");
    return s;
  }, [featured, newsletter]);
  const slideKey = slides.join(",");

  const [active, setActive] = useState<SlideId>("site");
  const [paused, setPaused] = useState(false);
  // Jump to the newest showcase when an option is turned on.
  const prev = useRef({ featured, newsletter });
  useEffect(() => {
    if (featured && !prev.current.featured) setActive("home");
    else if (newsletter && !prev.current.newsletter) setActive("digest");
    else if (!slides.includes(active)) setActive("site");
    prev.current = { featured, newsletter };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideKey]);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = window.setTimeout(() => {
      setActive((a) => slides[(slides.indexOf(a) + 1) % slides.length]);
    }, 4200);
    return () => window.clearTimeout(t);
  }, [active, slides, paused]);

  const caption = supporter
    ? { e: "No Bar Supporter", t: "Your site stays untouched.", s: "Listed across the network. Nothing added to your pages." }
    : active === "digest"
      ? { e: "Sunday digest", t: "First thing in every inbox.", s: `Your sponsor card leads the email to ${audience ? audience.toLocaleString() : "every"} founders.` }
      : featured
        ? { e: "Guaranteed clicks", t: "Featured on every screen.", s: `Gold highlight on the homepage, network and leaderboard until ${pack?.clicks.toLocaleString() ?? ""} real clicks arrive.` }
        : { e: "Network listing", t: "One bar. Every member site.", s: "Your startup rotates across the network on desktop and mobile." };

  const Fav = ({ size = 16 }: { size?: number }) => favicon
    ? <img src={favicon} alt="" width={size} height={size} className="shrink-0 rounded" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
    : <span className="shrink-0 rounded bg-foreground/15" style={{ width: size, height: size }} />;

  const chrome = (host: string) => (
    <div className="mk-chrome"><i /><i /><i /><span>{host}</span></div>
  );

  const phoneBar = <WidgetBarMock mobile name={displayName} desc={displayDesc} favicon={favicon} placement={placement} featured={featured} />;

  return (
    <div className="stage" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="stage-devices">
        <div className="stage-row">
          <div className="stage-laptop">
            <div className="stage-laptop-lid">
              <span className="stage-camera" aria-hidden />
              <div className="stage-laptop-screen">
                <div className={`mk-slide ${active === "site" ? "is-on" : ""}`}>{laptop}</div>

                {featured && (
                  <div className={`mk-slide mk-page ${active === "home" ? "is-on" : ""}`} aria-hidden={active !== "home"}>
                    {chrome("startupbar.co")}
                    <div className="mk-body">
                      <div className="mk-nav"><b>StartupBar</b><span>Network</span><span>Leaderboard</span><span>Pricing</span></div>
                      <div className="mk-home">
                        <div className="mk-hero">
                          <p className="mk-h1">Grow with founders,<br />not ads.</p>
                          <p className="mk-p">A free traffic exchange for indie startups.</p>
                          <span className="mk-btn">Join the network</span>
                        </div>
                        <div className="mk-rail">
                          <p className="mk-eyebrow">Featured</p>
                          <div className="mk-gold mk-slot is-you"><Fav size={18} /><div className="min-w-0"><b>{displayName}</b><span>{displayDesc}</span></div><Sparkles className="mk-spark" /></div>
                          <div className="mk-slot"><span className="mk-dot" /><div className="min-w-0"><b>{OTHERS[0].n}</b><span>{OTHERS[0].d}</span></div></div>
                          <div className="mk-slot is-empty">Open spot</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {featured && (
                  <div className={`mk-slide mk-page ${active === "network" ? "is-on" : ""}`} aria-hidden={active !== "network"}>
                    {chrome("startupbar.co/network")}
                    <div className="mk-body">
                      <p className="mk-h2">The network</p>
                      <div className="mk-grid">
                        <div className="mk-gold mk-card is-you"><div className="flex items-center gap-1.5"><Fav size={16} /><b>{displayName}</b></div><span>{displayDesc}</span><em><Sparkles /> Featured</em></div>
                        {OTHERS.map((o) => (
                          <div key={o.n} className="mk-card"><div className="flex items-center gap-1.5"><span className="mk-dot" /><b>{o.n}</b></div><span>{o.d}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {featured && (
                  <div className={`mk-slide mk-page ${active === "leaderboard" ? "is-on" : ""}`} aria-hidden={active !== "leaderboard"}>
                    {chrome("startupbar.co/leaderboard")}
                    <div className="mk-body">
                      <p className="mk-h2">Leaderboard</p>
                      <div className="mk-table">
                        {[OTHERS[1], null, OTHERS[2], OTHERS[3], OTHERS[4]].map((o, i) => (
                          <div key={i} className={`mk-row ${o ? "" : "mk-gold is-you"}`}>
                            <span className="mk-rank">{i + 1}</span>
                            {o ? <span className="mk-dot" /> : <Fav size={14} />}
                            <b>{o ? o.n : displayName}</b>
                            {!o && <em><Trophy /> Featured</em>}
                            <span className="mk-num">{(4820 - i * 730).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {newsletter && (
                  <div className={`mk-slide mk-page ${active === "digest" ? "is-on" : ""}`} aria-hidden={active !== "digest"}>
                    {chrome("Mail")}
                    <div className="mk-mail">
                      <div className="mk-inbox">
                        <div className="mk-mrow is-on"><b>StartupBar</b><span>Your week in the network</span></div>
                        <div className="mk-mrow"><b>Stripe</b><span>Payout sent</span></div>
                        <div className="mk-mrow"><b>GitHub</b><span>New star on repo</span></div>
                        <div className="mk-mrow"><b>Linear</b><span>Weekly summary</span></div>
                      </div>
                      <div className="mk-email">
                        <p className="mk-subj">Your week in the network</p>
                        <p className="mk-from">StartupBar · Sunday, 9:00 AM</p>
                        <div className="mk-sponsor">
                          <p className="mk-eyebrow">This week's featured sponsor</p>
                          <div className="flex items-center gap-2"><Fav size={22} /><div className="min-w-0"><b>{displayName}</b><span>{displayDesc}</span></div></div>
                          <span className="mk-sbtn">Visit {displayName} →</span>
                        </div>
                        <div className="mk-lines"><i /><i /><i /></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="stage-laptop-base" aria-hidden />
          </div>

          <div className="stage-phone" aria-hidden>
            <div className="stage-phone-screen mock-blend">
              <span className="stage-phone-notch" />
              {newsletter && (
                <div key={active === "digest" ? "n-on" : "n-off"} className={`mk-notify ${active === "digest" ? "is-on" : ""}`}>
                  <span className="mk-notify-icon"><Mail /></span>
                  <div className="min-w-0"><b>StartupBar</b><span>Featured this week: {displayName}</span></div>
                </div>
              )}
              <div className="flex h-full flex-col pt-7">
                {!supporter && placement === "top" && phoneBar}
                <div className="flex-1 space-y-2 px-3 py-4">
                  <div className="h-2.5 w-3/4 rounded-full bg-foreground/10" />
                  <div className="h-2.5 w-1/2 rounded-full bg-foreground/10" />
                  <div className="mt-4 h-24 rounded-lg bg-foreground/[0.05]" />
                  <div className="h-2 w-full rounded-full bg-foreground/[0.07]" />
                  <div className="h-2 w-5/6 rounded-full bg-foreground/[0.07]" />
                  <div className="h-2 w-2/3 rounded-full bg-foreground/[0.07]" />
                  <div className="mt-4 h-7 w-24 rounded-full bg-foreground/[0.12]" />
                </div>
                {!supporter && placement === "bottom" && phoneBar}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stage-foot">
        <div className={`stage-tabs ${slides.length > 1 ? "is-on" : ""}`} role="tablist" aria-label="Preview screens">
          {slides.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={active === s} className={active === s ? "is-on" : ""} onClick={() => setActive(s)}>
              {SLIDE_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="stage-caption">
          <div key={caption.t} className="stage-caption-inner">
            <p className="stage-eyebrow">{caption.e}</p>
            <p className="stage-title">{caption.t}</p>
            <p className="stage-sub">{caption.s}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
