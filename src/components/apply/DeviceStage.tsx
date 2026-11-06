import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Mail } from "lucide-react";
import type { CheckoutPlan } from "@/lib/checkout-plans";
import { findPack } from "@/lib/checkout-plans";
import { useAudience } from "./PlanPicker";
import { DesktopNetworkMock, MobileNetworkMock } from "./NetworkMocks";
import { previewSlides, type PreviewFocus, type PreviewSlide } from "@/lib/apply-preview-slides";
import { NewsletterPreview } from "./NewsletterPreview";

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
    const t = window.setTimeout(measure, 800);
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

type SlideId = PreviewSlide;
const SLIDE_LABEL: Record<SlideId, string> = {
  site: "Your site", network: "Featured rails", list: "Network list", leaderboard: "Leaderboard", digest: "Sunday digest",
};

export function DeviceStage({
  laptop, mobile, name, desc, url, plan, focus,
}: {
  laptop: ReactNode; mobile: ReactNode; name: string; desc: string; url: string; placement: "top" | "bottom"; plan: CheckoutPlan; focus?: PreviewFocus;
}) {
  const featured = plan.base === "clicks";
  const supporter = plan.base === "supporter";
  const newsletter = !!plan.newsletter && !supporter;
  const pack = findPack(plan.clicks);
  const audience = useAudience().data ?? 0;
  const displayName = name.trim() || "Your Startup";
  const displayDesc = desc.trim() || "Your one liner goes here";
  const favicon = url ? `https://www.google.com/s2/favicons?domain=${url}&sz=64` : null;

  const slides = useMemo(() => previewSlides(plan, focus), [plan.base, plan.newsletter, focus]);
  const slideKey = slides.join(",");

  const [selectedSlide, setActive] = useState<SlideId>(() => slides[0]);
  const active = slides.includes(selectedSlide) ? selectedSlide : slides[0];
  const [paused, setPaused] = useState(false);
  // Jump to the newest showcase when an option is turned on.
  const prev = useRef({ featured, newsletter });
  useEffect(() => {
    if (featured && !prev.current.featured) setActive("network");
    else if (newsletter && !prev.current.newsletter) setActive("digest");
    else if (!slides.includes(selectedSlide)) setActive(slides[0]);
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
        ? { e: "Guaranteed clicks", t: "Featured on every screen.", s: `Gold spot in the featured rails, network list and leaderboard on desktop and mobile until ${pack?.clicks.toLocaleString() ?? ""} real clicks arrive.` }
        : { e: "Network listing", t: "One bar. Every member site.", s: "Your startup rotates across the network on desktop and mobile." };

  const Fav = ({ size = 16 }: { size?: number }) => favicon
    ? <img src={favicon} alt="" width={size} height={size} className="shrink-0 rounded" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
    : <span className="shrink-0 rounded bg-foreground/15" style={{ width: size, height: size }} />;

  const you = { name: displayName, desc: displayDesc, url };
  const isMockPage = active === "network" || active === "list" || active === "leaderboard";

  const chrome = (host: string) => (
    <div className="mk-chrome"><i /><i /><i /><span>{host}</span></div>
  );

  return (
    <div className="stage" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="stage-devices">
        <div className="stage-row">
          <div className="stage-laptop">
            <div className="stage-laptop-lid">
              <span className="stage-camera" aria-hidden />
              <div className="stage-laptop-screen">
                <div className={`mk-slide ${active === "site" ? "is-on" : ""}`}>{laptop}</div>

                {featured && (["network", "list", "leaderboard"] as const).map((pg) => (
                  <div key={pg} className={`mk-slide ${active === pg ? "is-on" : ""}`} aria-hidden={active !== pg}>
                    <DesktopNetworkMock page={pg} you={you} />
                  </div>
                ))}

                {newsletter && (
                  <div className={`mk-slide mk-page ${active === "digest" ? "is-on" : ""}`} aria-hidden={active !== "digest"}>
                    <NewsletterPreview name={name} desc={desc} url={url} date={plan.newsletterDate} />
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
              <div className="stage-phone-site">
                <div className={`mk-slide ${active === "site" ? "is-on" : ""}`}>{mobile}</div>
                {newsletter && <div className={`mk-slide ${active === "digest" ? "is-on" : ""}`}><NewsletterPreview mobile name={name} desc={desc} url={url} date={plan.newsletterDate} /></div>}
                {featured && (["network", "list", "leaderboard"] as const).map((pg) => (
                  <div key={pg} className={`mk-slide ${active === pg ? "is-on" : ""}`}>
                    <MobileNetworkMock page={pg} you={you} />
                  </div>
                ))}
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
