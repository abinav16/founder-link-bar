import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Mail, MousePointerClick, ShieldCheck, Sparkles, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CLICK_PACKS, findPack, newsletterPriceUsd, NEWSLETTER_PRICE_PER_FOUNDER_USD, packSavingsPct, perClick, planTotalUsd,
  type CheckoutPlan,
} from "@/lib/checkout-plans";
import { SUPPORTER_PRICE_USD, SUPPORTER_TRIAL_DAYS } from "@/lib/supporter";

function useAudience() {
  return useQuery({
    queryKey: ["newsletter-audience"],
    queryFn: async () => {
      const { data } = await supabase.rpc("public_newsletter_audience");
      return typeof data === "number" && data > 0 ? data : 0;
    },
    staleTime: 5 * 60_000,
  });
}

/** Number that eases toward its target when it changes. */
function RollingNumber({ value, prefix = "$", decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    const from = shown; const start = performance.now(); let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 420);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(from + (value - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className="tabular-nums">{prefix}{shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
      <span>{children}</span>
    </li>
  );
}

type CardProps = {
  selected: boolean; onSelect: () => void; icon: React.ReactNode; title: string; price: React.ReactNode;
  tagline: string; children?: React.ReactNode; gold?: boolean; delay: number; role?: "radio" | "checkbox";
};

function PlanCard({ selected, onSelect, icon, title, price, tagline, children, gold, delay, role = "radio" }: CardProps) {
  return (
    <div
      role={role}
      aria-checked={selected}
      aria-label={title}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      style={{ animationDelay: `${delay}ms` }}
      className={`checkout-card ${selected ? "is-selected" : ""} ${gold ? "is-gold" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="checkout-icon">{icon}</span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="whitespace-nowrap text-right text-lg font-semibold tracking-tight text-foreground">{price}</div>
          <span className="checkout-radio" aria-hidden><Check className="h-3 w-3" /></span>
        </div>
      </div>
      <div className="checkout-card-body">{children}</div>
    </div>
  );
}

export function usePlanPricing(plan: CheckoutPlan) {
  const { data: audience = 0 } = useAudience();
  const pack = findPack(plan.clicks) ?? CLICK_PACKS[2];
  return { audience, pack, nlPrice: newsletterPriceUsd(audience), total: planTotalUsd(plan, audience), isSupporter: plan.base === "supporter" };
}

export function PlanOptions({ plan, onChange, startupName }: { plan: CheckoutPlan; onChange: (p: CheckoutPlan) => void; startupName: string }) {
  const { audience, pack, nlPrice, isSupporter } = usePlanPricing(plan);
  return (
    <div className="space-y-4" role="radiogroup" aria-label="Plan">
          <PlanCard
            delay={0} selected={plan.base === "free"} onSelect={() => onChange({ ...plan, base: "free" })}
            icon={<Sparkles className="h-4 w-4" />} title="Network listing" tagline="Show the bar, get shown back." price="Free"
          >
            <ul className="space-y-2">
              <Bullet>Your startup rotates across every site in the network.</Bullet>
              <Bullet>One small bar on your site in return, fully automatic.</Bullet>
              <Bullet>Remove the script anytime. No card, no lock-in.</Bullet>
            </ul>
          </PlanCard>

          <PlanCard
            delay={70} gold selected={plan.base === "clicks"}
            onSelect={() => onChange({ ...plan, base: "clicks", clicks: plan.clicks ?? 500 })}
            icon={<MousePointerClick className="h-4 w-4" />} title="Guaranteed clicks" tagline="Featured spot until every click is delivered."
            price={<><RollingNumber value={pack.priceUsd} /><span className="block text-[11px] font-normal text-muted-foreground">one-time</span></>}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" onClick={(e) => e.stopPropagation()}>
              {CLICK_PACKS.map((p) => {
                const on = plan.base === "clicks" && p.clicks === pack.clicks;
                const save = packSavingsPct(p);
                return (
                  <button
                    key={p.clicks} type="button" aria-pressed={on}
                    onClick={() => onChange({ ...plan, base: "clicks", clicks: p.clicks })}
                    className={`checkout-pack ${on ? "is-on" : ""}`}
                  >
                    {p.popular && <span className="checkout-pack-flag">Most chosen</span>}
                    <span className="text-lg font-semibold tabular-nums text-foreground">{p.clicks.toLocaleString()}</span>
                    <span className="text-[11px] text-muted-foreground">clicks</span>
                    <span className="mt-2 text-sm font-medium text-foreground">${p.priceUsd}</span>
                    <span className="text-[11px] text-muted-foreground">${perClick(p).toFixed(2)}/click{save > 0 ? ` · save ${save}%` : ""}</span>
                  </button>
                );
              })}
            </div>
            <ul className="mt-4 space-y-2">
              <Bullet>Gold featured slot on the network page and priority in the bar.</Bullet>
              <Bullet>Only real, bot-filtered clicks count toward your total.</Bullet>
              <Bullet><span className="font-medium text-foreground">Our promise:</span> the slot stays live until all {pack.clicks.toLocaleString()} clicks arrive.</Bullet>
            </ul>
          </PlanCard>

          <PlanCard
            delay={140} role="checkbox" selected={!!plan.newsletter && !isSupporter}
            onSelect={() => onChange({ ...plan, base: isSupporter ? "free" : plan.base, newsletter: !plan.newsletter || isSupporter })}
            icon={<Mail className="h-4 w-4" />} title="Sunday newsletter spot" tagline="Add-on · Sponsor card in the weekly founder digest."
            price={<><RollingNumber value={nlPrice} decimals={2} /><span className="block text-[11px] font-normal text-muted-foreground">one send</span></>}
          >
            <div className="checkout-mail-preview">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">This week's featured sponsor</span>
              <p className="mt-1.5 text-sm font-semibold text-foreground">{startupName.trim() || "Your startup"}</p>
              <p className="text-xs text-muted-foreground">Your logo, one-liner and a direct link. The first thing founders see.</p>
            </div>
            <ul className="mt-4 space-y-2">
              <Bullet>${NEWSLETTER_PRICE_PER_FOUNDER_USD.toFixed(2)} per founder · {audience ? `${audience.toLocaleString()} founders on the list today` : "priced from the live list"}.</Bullet>
              <Bullet>Price locks in at checkout. Works with Free or Guaranteed clicks.</Bullet>
            </ul>
          </PlanCard>

          <div className="checkout-divider"><span>Or skip the bar entirely</span></div>

          <PlanCard
            delay={210} selected={isSupporter} onSelect={() => onChange({ base: "supporter" })}
            icon={<EyeOff className="h-4 w-4" />} title="No Bar Supporter" tagline="Get listed without showing anything on your site."
            price={<>${SUPPORTER_PRICE_USD}<span className="block text-[11px] font-normal text-muted-foreground">per year</span></>}
          >
            <ul className="space-y-2">
              <Bullet>{SUPPORTER_TRIAL_DAYS} days free, then ${SUPPORTER_PRICE_USD}/year. Cancel anytime.</Bullet>
              <Bullet>Shown across the network at an average member's share.</Bullet>
              <Bullet>Gold highlight on the network page and leaderboard.</Bullet>
            </ul>
          </PlanCard>
    </div>
  );
}

export function OrderSummary({ plan, onContinue, label = "Continue to install" }: { plan: CheckoutPlan; onContinue?: () => void; label?: string }) {
  const { pack, nlPrice, total, isSupporter } = usePlanPricing(plan);
  return (
        <aside className="checkout-summary is-docked">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your order</span>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between gap-3"><span className="text-foreground">{isSupporter ? "No Bar Supporter" : "Network listing"}</span><span className="text-muted-foreground">{isSupporter ? `${SUPPORTER_TRIAL_DAYS}-day trial` : "Free"}</span></li>
            {plan.base === "clicks" && <li className="checkout-line flex justify-between gap-3"><span className="text-foreground">{pack.clicks.toLocaleString()} guaranteed clicks</span><span className="text-foreground">${pack.priceUsd}</span></li>}
            {plan.newsletter && !isSupporter && <li className="checkout-line flex justify-between gap-3"><span className="text-foreground">Newsletter spot</span><span className="text-foreground">${nlPrice.toFixed(2)}</span></li>}
          </ul>
          <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
            <span className="text-sm text-muted-foreground">Due today</span>
            <span className="text-3xl font-semibold tracking-tight text-foreground"><RollingNumber value={total} decimals={total % 1 ? 2 : 0} /></span>
          </div>
          <button type={onContinue ? "button" : "submit"} onClick={onContinue} className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-85">
            {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {total > 0 ? "Nothing is charged yet. You pay after your install is verified, and boosts start when we approve your listing." : "No card needed. We review every listing within 24 hours."}
          </p>
        </aside>
  );
}
