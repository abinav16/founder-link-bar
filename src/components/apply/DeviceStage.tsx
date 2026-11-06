import type { ReactNode } from "react";
import { Mail, MousePointerClick, Sparkles, EyeOff } from "lucide-react";
import type { CheckoutPlan } from "@/lib/checkout-plans";
import { findPack } from "@/lib/checkout-plans";

/** Locked left-hand stage: laptop + phone showing where the bar and featured spot appear. */
export function DeviceStage({
  laptop, name, desc, url, placement, plan,
}: {
  laptop: ReactNode; name: string; desc: string; url: string; placement: "top" | "bottom"; plan: CheckoutPlan;
}) {
  const featured = plan.base === "clicks";
  const supporter = plan.base === "supporter";
  const newsletter = !!plan.newsletter && !supporter;
  const pack = findPack(plan.clicks);
  const displayName = name.trim() || "Your Startup";
  const favicon = url ? `https://www.google.com/s2/favicons?domain=${url}&sz=32` : null;

  const caption = supporter
    ? { t: "Nothing on your site.", s: "You're listed across the network — no bar, no layout changes." }
    : featured
      ? { t: "Featured, everywhere.", s: `Gold spot in the bar until ${pack?.clicks.toLocaleString() ?? ""} real clicks arrive.` }
      : { t: "One bar. Whole network.", s: "Your startup rotates on every member's site, on every screen." };

  const phoneBar = (
    <div className={`stage-phone-bar ${featured ? "is-featured" : ""} ${placement === "top" ? "border-b" : "border-t"}`}>
      {featured ? <Sparkles className="h-2.5 w-2.5 shrink-0" /> : <span className="stage-phone-brand">SB</span>}
      {favicon && <img src={favicon} alt="" className="h-3 w-3 rounded-sm" onError={(e) => (e.currentTarget.style.display = "none")} />}
      <span className="truncate font-medium">{displayName}</span>
      <span className="ml-auto shrink-0 opacity-60">Visit</span>
    </div>
  );

  return (
    <div className="stage">
      <div className="stage-glow" data-mode={supporter ? "supporter" : featured ? "featured" : "free"} aria-hidden />

      <div className="stage-devices">
        {/* Laptop */}
        <div className="stage-laptop">
          <div className="stage-laptop-lid">
            <span className="stage-camera" aria-hidden />
            <div className={`stage-laptop-screen ${featured ? "is-featured" : ""}`}>{laptop}</div>
          </div>
          <div className="stage-laptop-base" aria-hidden />
        </div>

        {/* Phone */}
        <div className="stage-phone" aria-hidden>
          <div className="stage-phone-screen">
            <span className="stage-phone-notch" />
            <div className="flex h-full flex-col pt-5">
              {!supporter && placement === "top" && phoneBar}
              <div className="flex-1 space-y-1.5 px-2.5 py-3">
                <div className="h-2 w-3/4 rounded-full bg-foreground/10" />
                <div className="h-2 w-1/2 rounded-full bg-foreground/10" />
                <div className="mt-3 h-14 rounded-md bg-foreground/[0.05]" />
                <div className="h-2 w-full rounded-full bg-foreground/[0.07]" />
                <div className="h-2 w-5/6 rounded-full bg-foreground/[0.07]" />
                <div className="h-2 w-2/3 rounded-full bg-foreground/[0.07]" />
              </div>
              {!supporter && placement === "bottom" && phoneBar}
              {supporter && (
                <div className="stage-float-in absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card px-2 py-1 text-center text-[9px] font-semibold text-foreground">
                  No bar
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating callouts */}
        {featured && (
          <div key={`f-${pack?.clicks}`} className="stage-callout stage-callout-featured">
            <MousePointerClick className="h-3.5 w-3.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Featured spot</p>
              <p className="truncate text-xs font-semibold">{pack?.clicks.toLocaleString()} guaranteed clicks</p>
            </div>
          </div>
        )}
        {newsletter && (
          <div className="stage-callout stage-callout-mail">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sunday digest</p>
              <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{desc.trim() || "Your one-liner, first in the inbox"}</p>
            </div>
          </div>
        )}
        {supporter && (
          <div className="stage-callout stage-callout-featured">
            <EyeOff className="h-3.5 w-3.5" />
            <p className="text-xs font-semibold">Gold listing · no bar</p>
          </div>
        )}
      </div>

      <div key={caption.t} className="stage-caption">
        <p className="text-xl font-semibold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {caption.t} <span className="text-muted-foreground">{caption.s}</span>
        </p>
      </div>
    </div>
  );
}
