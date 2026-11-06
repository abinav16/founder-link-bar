import type { ReactNode } from "react";
import type { CheckoutPlan } from "@/lib/checkout-plans";
import { findPack } from "@/lib/checkout-plans";
import { WidgetBarMock } from "./WidgetBarMock";

/** Locked stage: laptop and phone side by side, showing the real bar design on each screen. */
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
  const displayDesc = desc.trim() || "Your one liner goes here";
  const favicon = url ? `https://www.google.com/s2/favicons?domain=${url}&sz=32` : null;

  const caption = supporter
    ? { e: "No Bar Supporter", t: "Your site stays untouched.", s: "Listed across the network. Nothing added to your pages." }
    : featured
      ? { e: "Guaranteed clicks", t: "Featured on every screen.", s: `Your spot stays live until ${pack?.clicks.toLocaleString() ?? ""} real clicks arrive.` }
      : { e: "Network listing", t: "One bar. Every member site.", s: newsletter ? "Plus a feature in the Sunday digest." : "Your startup rotates across the network on desktop and mobile." };

  const phoneBar = <WidgetBarMock mobile name={displayName} desc={displayDesc} favicon={favicon} placement={placement} featured={featured} />;

  return (
    <div className="stage">
      <div className="stage-devices">
        <div className="stage-laptop">
          <div className="stage-laptop-lid">
            <span className="stage-camera" aria-hidden />
            <div className={`stage-laptop-screen ${supporter ? "is-clean" : ""}`}>{laptop}</div>
          </div>
          <div className="stage-laptop-base" aria-hidden />
        </div>

        <div className="stage-phone" aria-hidden>
          <div className="stage-phone-screen mock-blend">
            <span className="stage-phone-notch" />
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

      <div className="stage-caption">
        <div key={caption.t} className="stage-caption-inner">
          <p className="stage-eyebrow">{caption.e}</p>
          <p className="stage-title">{caption.t}</p>
          <p className="stage-sub">{caption.s}</p>
        </div>
      </div>
    </div>
  );
}
