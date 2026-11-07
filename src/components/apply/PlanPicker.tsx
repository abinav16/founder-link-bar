import { useEffect, useState } from "react";
import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNewsletterBookedDates } from "@/lib/newsletter-availability.functions";
import { ArrowRight, Check, Mail, MousePointerClick, ShieldCheck, Sparkles, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CLICK_PACKS, findPack, newsletterPriceUsd, NEWSLETTER_PRICE_PER_FOUNDER_USD, packSavingsPct, perClick, planTotalUsd, listingFeeUsd, ADDITIONAL_LISTING_PRICE_USD, type ListingKind,
  type CheckoutPlan,
} from "@/lib/checkout-plans";
import { SUPPORTER_PRICE_USD, SUPPORTER_TRIAL_DAYS } from "@/lib/supporter";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isNewsletterDateAvailable, nextAvailableNewsletterSunday, newsletterDateLabel } from "@/lib/newsletter-slots";
import type { PreviewFocus } from "@/lib/apply-preview-slides";

export function useAudience() {
  return useQuery({
    queryKey: ["newsletter-audience"],
    queryFn: async () => {
      const { data } = await supabase.rpc("public_newsletter_audience");
      return typeof data === "number" && data > 0 ? data : 0;
    },
    staleTime: 5 * 60_000,
  });
}

export function useNewsletterAvailability() {
  const getDates = useServerFn(getNewsletterBookedDates);
  return useQuery({
    queryKey: ["newsletter-booked-dates"], queryFn: () => getDates(),
    staleTime: 0, refetchInterval: 30_000, retry: 1,
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
      data-preview-section={title === "Guaranteed clicks" ? "clicks" : title === "Sunday newsletter spot" ? "newsletter" : "site"}
      data-preview-selected={selected ? "true" : "false"}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      style={{ animationDelay: `${delay}ms` }}
      className={`checkout-card ${selected ? "is-selected" : ""} ${gold ? "is-gold" : ""}`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
          <span className="checkout-icon">{icon}</span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{tagline}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="whitespace-nowrap text-right text-lg font-semibold tracking-tight text-foreground">{price}</div>
          <span className="checkout-radio" aria-hidden><Check className="h-3 w-3" /></span>
        </div>
      </div>
      <div className="checkout-card-body">{children}</div>
    </div>
  );
}

const LISTING_LABEL: Record<ListingKind, { title: string; price: string; note: string }> = {
  first: { title: "Network listing", price: "Free", note: "Your first startup is free." },
  additional: { title: "Additional listing", price: `$${ADDITIONAL_LISTING_PRICE_USD}`, note: "One-time fee for each extra startup you list." },
  prepaid: { title: "Additional listing", price: "Prepaid", note: "Uses a listing credit you already paid for." },
  resubmit: { title: "Resubmission", price: "Free", note: "Resubmitting a listing is always free." },
};

export function usePlanPricing(plan: CheckoutPlan, kind: ListingKind = "first") {
  const { data: audience = 0 } = useAudience();
  const pack = findPack(plan.clicks) ?? CLICK_PACKS[2];
  return { audience, pack, nlPrice: newsletterPriceUsd(audience), total: planTotalUsd(plan, audience, kind), listingFee: listingFeeUsd(plan, kind), isSupporter: plan.base === "supporter" };
}

export function PlanOptions({ plan, onChange, startupName, onFocusPreview, listing = "first", guest = false }: { plan: CheckoutPlan; onChange: (p: CheckoutPlan) => void; startupName: string; onFocusPreview?: (f: PreviewFocus) => void; listing?: ListingKind; guest?: boolean }) {
  const { audience, pack, nlPrice, isSupporter } = usePlanPricing(plan, listing);
  const L = LISTING_LABEL[listing];
  const availability = useNewsletterAvailability();
  const booked = availability.data ?? [];
  const ready = availability.isSuccess && !availability.isError;
  const dateUnavailable = !!plan.newsletterDate && ready && !isNewsletterDateAvailable(parseISO(plan.newsletterDate), booked);
  useEffect(() => {
    if (plan.newsletter && !isSupporter && !plan.newsletterDate && ready) {
      const date = nextAvailableNewsletterSunday(booked);
      if (date) onChange({ ...plan, newsletterDate: date });
    }
  }, [plan, isSupporter, ready, availability.data, onChange]);
  return (
    <div className="space-y-4" role="radiogroup" aria-label="Plan">
          <PlanCard
            delay={0} selected={plan.base === "free"} onSelect={() => { onFocusPreview?.("site"); onChange({ ...plan, base: "free" }); }}
            icon={<Sparkles className="h-4 w-4" />} title={L.title} tagline="Show the bar, get shown back."
            price={listing === "additional" ? <>{L.price}<span className="block text-[11px] font-normal text-muted-foreground">one-time</span></> : L.price}
          >
            <ul className="space-y-2">
              {listing !== "first" ? <Bullet><span className="font-medium text-foreground">{L.note}</span></Bullet> : guest ? <Bullet>First startup is free. Extra startups are ${ADDITIONAL_LISTING_PRICE_USD} each, confirmed after sign-in.</Bullet> : null}
              <Bullet>Your startup rotates across every site in the network.</Bullet>
              <Bullet>One small bar on your site in return, fully automatic.</Bullet>
              <Bullet>Remove the script anytime. No card, no lock-in.</Bullet>
            </ul>
          </PlanCard>

          <PlanCard
            delay={70} gold selected={plan.base === "clicks"}
            onSelect={() => { onFocusPreview?.("clicks"); onChange({ ...plan, base: "clicks", clicks: plan.clicks ?? 500 }); }}
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
                    onClick={() => { onFocusPreview?.("clicks"); onChange({ ...plan, base: "clicks", clicks: p.clicks }); }}
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
              <Bullet>Priority in the bar across member sites, plus a featured card on the network page.</Bullet>
              <Bullet>Only real, bot-filtered clicks count toward your total.</Bullet>
              <Bullet><span className="font-medium text-foreground">Our promise:</span> you stay featured until all {pack.clicks.toLocaleString()} clicks arrive.</Bullet>
            </ul>
          </PlanCard>

          <PlanCard
            delay={140} role="checkbox" selected={!!plan.newsletter || isSupporter}
            onSelect={() => { if (isSupporter) { onFocusPreview?.("newsletter"); return; } const on = !plan.newsletter; onFocusPreview?.(on ? "newsletter" : plan.base === "clicks" ? "clicks" : "site"); onChange({ ...plan, newsletter: on }); }}
            icon={<Mail className="h-4 w-4" />} title="Sunday newsletter spot" tagline="Add-on · Sponsor card in the weekly founder digest."
            price={isSupporter ? <><span className="text-sm">Included</span><span className="block text-[11px] font-normal text-muted-foreground">one send</span></> : <><RollingNumber value={nlPrice} decimals={2} /><span className="block text-[11px] font-normal text-muted-foreground">one send</span></>}
          >
            <div className="checkout-mail-preview" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {isSupporter ? <p className="text-sm leading-relaxed text-muted-foreground">Complimentary with Supporter. Choose an available Sunday from your dashboard after your first annual payment clears. No date is reserved during the trial.</p> : <>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preferred send date</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" disabled={!ready} onClick={() => { onFocusPreview?.("newsletter"); void availability.refetch(); }} className="mt-2 h-auto w-full justify-between gap-3 whitespace-normal px-3 py-3 text-left text-sm font-medium">
                    <span className="min-w-0">{newsletterDateLabel(plan.newsletterDate)}</span> <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
                  <Calendar mode="single" selected={plan.newsletterDate ? parseISO(plan.newsletterDate) : undefined}
                    defaultMonth={plan.newsletterDate ? parseISO(plan.newsletterDate) : undefined}
                    disabled={(d) => !ready || !isNewsletterDateAvailable(d, booked)}
                    onSelect={(d) => { if (!d || !ready || !isNewsletterDateAvailable(d, booked)) return; onFocusPreview?.("newsletter"); onChange({ ...plan, base: isSupporter ? "free" : plan.base, newsletter: true, newsletterDate: format(d, "yyyy-MM-dd") }); }}
                    className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <p role={availability.isError || dateUnavailable ? "alert" : "status"} className="mt-2 text-xs text-muted-foreground">
                {availability.isError ? "We could not check availability. Please try again." : !ready ? "Checking available Sundays…" : dateUnavailable ? "This Sunday is no longer available. Please choose another date." : "Booked Sundays are unavailable. Your date is confirmed only after payment."}
              </p>
              {availability.isError && <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void availability.refetch()}>Try again</Button>}
              <p className="mt-2 text-xs text-muted-foreground">Sponsor card for {startupName.trim() || "your startup"} in that Sunday's founder email.</p>
              </>}
            </div>
            <ul className="mt-4 space-y-2">
              {isSupporter ? <Bullet>One complimentary sponsorship after your first ${SUPPORTER_PRICE_USD} annual payment.</Bullet> : <><Bullet>${NEWSLETTER_PRICE_PER_FOUNDER_USD.toFixed(2)} per founder · {audience ? `${audience.toLocaleString()} founders on the list today` : "priced from the live list"}.</Bullet>
              <Bullet>Price locks in at checkout. Works with Free or Guaranteed clicks.</Bullet></>}
            </ul>
          </PlanCard>

          <div className="checkout-divider"><span>Or skip the bar entirely</span></div>

          <PlanCard
            delay={210} selected={isSupporter} onSelect={() => { onFocusPreview?.("site"); onChange({ base: "supporter" }); }}
            icon={<EyeOff className="h-4 w-4" />} title="No Bar Supporter" tagline="Get listed without showing anything on your site."
            price={<>${SUPPORTER_PRICE_USD}<span className="block text-[11px] font-normal text-muted-foreground">per year</span></>}
          >
            <ul className="space-y-2">
              <Bullet>{SUPPORTER_TRIAL_DAYS} days free, then ${SUPPORTER_PRICE_USD}/year. Cancel anytime.</Bullet>
              <Bullet>Shown across the network at an average member's share.</Bullet>
              <Bullet>Gold highlight on the network page and leaderboard.</Bullet>
              <Bullet>One complimentary Sunday newsletter sponsorship, unlocked after your first annual payment clears.</Bullet>
            </ul>
          </PlanCard>
    </div>
  );
}

export function OrderSummary({ plan, onContinue, label = "Continue to install", listing = "first", disabled = false, footnote, className = "is-docked", skipDateCheck = false }: { plan: CheckoutPlan; onContinue?: () => void; label?: React.ReactNode; listing?: ListingKind; disabled?: boolean; footnote?: React.ReactNode; className?: string; skipDateCheck?: boolean }) {
  const { pack, nlPrice, total, isSupporter, listingFee } = usePlanPricing(plan, listing);
  const L = LISTING_LABEL[listing];
  const availability = useNewsletterAvailability();
  const newsletterBlocked = !skipDateCheck && !!plan.newsletter && !isSupporter && (!availability.isSuccess || availability.isError || !plan.newsletterDate || !isNewsletterDateAvailable(parseISO(plan.newsletterDate), availability.data ?? []));
  return (
        <aside className={`checkout-summary ${className}`}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your order</span>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between gap-3"><span className="text-foreground">{isSupporter ? "No Bar Supporter" : L.title}</span><span className={listingFee ? "text-foreground" : "text-muted-foreground"}>{isSupporter ? `${SUPPORTER_TRIAL_DAYS}-day trial` : listingFee ? `$${listingFee.toFixed(2)}` : L.price}</span></li>
            {plan.base === "clicks" && <li className="checkout-line flex justify-between gap-3"><span className="text-foreground">{pack.clicks.toLocaleString()} guaranteed clicks</span><span className="text-foreground">${pack.priceUsd}</span></li>}
            {plan.newsletter && !isSupporter && <li className="checkout-line flex justify-between gap-3"><span className="text-foreground">Newsletter spot<span className="block text-xs text-muted-foreground">{newsletterDateLabel(plan.newsletterDate)}</span></span><span className="text-foreground">${nlPrice.toFixed(2)}</span></li>}
            {isSupporter && <li className="checkout-line flex justify-between gap-3"><span className="text-foreground">Sunday newsletter spot<span className="block text-xs text-muted-foreground">Unlocks after first annual payment</span></span><span className="text-muted-foreground">Complimentary</span></li>}
          </ul>
          <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
            <span className="text-sm text-muted-foreground">Due today</span>
            <span className="text-3xl font-semibold tracking-tight text-foreground"><RollingNumber value={total} decimals={total % 1 ? 2 : 0} /></span>
          </div>
          <Button disabled={newsletterBlocked || disabled} type={onContinue ? "button" : "submit"} onClick={onContinue} className="group mt-6 h-auto w-full gap-2 py-3.5 text-sm font-medium">
            {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {footnote ?? (isSupporter ? `${SUPPORTER_TRIAL_DAYS} days free, then $${SUPPORTER_PRICE_USD}/year. A card is required. Your newsletter spot unlocks after payment, not during the trial.` : total > 0 ? "Nothing is charged yet. You pay after your install is verified, and boosts start when we approve your listing." : "No card needed. We review every listing within 24 hours.")}
          </p>
        </aside>
  );
}
