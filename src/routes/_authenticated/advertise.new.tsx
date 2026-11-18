import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BarChart3, Check, CheckCircle2, Clock3, ExternalLink, Globe2, Image as ImageIcon, Layers3, Loader2, Mail, Monitor, ShieldCheck, Smartphone, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BannerCreative } from "@/components/BannerAd";
import { BoostClicksButton } from "@/components/BoostClicksDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  BANNER_WEEK_PRESETS, BANNER_DESKTOP, BANNER_MAX_WEEKS, BANNER_MOBILE,
  bannerTotalCents, fitsBannerSize, isValidWeeks, normalizeDestination,
} from "@/lib/banner-ads";
import { confirmBannerPayment, createBannerCheckout, getMyBannerCampaigns } from "@/lib/banner-ads.functions";

type Section = "banner" | "gold" | "newsletter" | "campaigns";

export const Route = createFileRoute("/_authenticated/advertise/new")({
  validateSearch: (s: Record<string, unknown>): { type?: Section } => {
    const t = s.type;
    return t === "banner" || t === "gold" || t === "newsletter" || t === "campaigns" ? { type: t } : {};
  },
  head: () => ({
    meta: [
      { title: "New campaign — Advertise on StartupBar" },
      { name: "description", content: "Set up a banner ad, gold highlight or newsletter sponsorship on StartupBar." },
      { property: "og:title", content: "New campaign — StartupBar" },
      { property: "og:description", content: "Set up your StartupBar ad campaign." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdSetup,
});

function useMyStartups() {
  return useQuery({
    queryKey: ["my-startups-ads"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("startups").select("id, name, status").eq("user_id", u.user.id);
      return data ?? [];
    },
  });
}

function AdSetup() {
  const search = Route.useSearch();
  const [section, setSection] = useState<Section>(search.type ?? "banner");
  const qc = useQueryClient();
  const confirmPayment = useServerFn(confirmBannerPayment);

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("banner");
    if (!id) return;
    url.searchParams.delete("banner"); url.searchParams.delete("payment_id"); url.searchParams.delete("status");
    window.history.replaceState(null, "", url.toString());
    setSection("campaigns");
    confirmPayment({ data: { campaignId: id } }).then((r) => {
      if (r.status === "in_review") toast.success("Payment received. We'll review your banner, usually within a day.");
      else if (r.status === "pending") toast("Payment is processing. Your banner goes to review once it clears.");
      else toast.error("We couldn't confirm that payment.");
      qc.invalidateQueries({ queryKey: ["my-banners"] });
    }).catch(() => toast.error("Payment confirmation is delayed. Your campaign will update once it clears."));
  }, [qc, confirmPayment]);

  const menu: { id: Section; label: string; detail: string; icon: typeof ImageIcon }[] = [
    { id: "banner", label: "Banner ad", detail: "$49 / week", icon: ImageIcon },
    { id: "gold", label: "Gold highlight", detail: "Guaranteed clicks", icon: Sparkles },
    { id: "newsletter", label: "Sunday newsletter", detail: "One exclusive sponsor", icon: Mail },
  ];

  return (
    <DashboardLayout fullWidth>
      <div className="campaign-studio">
        <header className="campaign-heading">
          <div>
            <Link to="/advertise" className="campaign-back"><ArrowLeft size={14} /> Advertise on StartupBar</Link>
            <h1>{section === "campaigns" ? "Your campaigns." : "Make your next big move."}</h1>
            <p>{section === "campaigns" ? "Your placements, progress and performance in one place." : "Your brand. The founder network. A campaign that fits."}</p>
          </div>
          <Button variant="outline" onClick={() => setSection(section === "campaigns" ? "banner" : "campaigns")} className="campaign-manage">
            {section === "campaigns" ? <ImageIcon /> : <BarChart3 />}{section === "campaigns" ? "New campaign" : "My campaigns"}<ArrowRight />
          </Button>
        </header>
        <nav className="campaign-formats" aria-label="Campaign sections">
          {menu.map((m) => (
            <Button variant="ghost" key={m.id} onClick={() => setSection(m.id)} aria-pressed={section === m.id} className="campaign-format">
              <span className="campaign-format-icon"><m.icon /></span>
              <span><strong>{m.label}</strong><small>{m.detail}</small></span>
              <span className="campaign-format-check">{section === m.id ? <CheckCircle2 /> : <ArrowRight />}</span>
            </Button>
          ))}
        </nav>
        <div key={section} className="campaign-content">
          {section === "banner" && <BannerSection />}
          {section === "gold" && <GoldSection />}
          {section === "newsletter" && <NewsletterSection />}
          {section === "campaigns" && <CampaignsSection />}
        </div>
        <div className="campaign-help"><ShieldCheck size={18} /><span>Every banner is reviewed before it goes live.</span><Button variant="link" asChild><a href="mailto:hello@startupbar.co">Need a hand? Talk to us <ArrowRight /></a></Button></div>
      </div>
    </DashboardLayout>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="campaign-section">
      <h2>{title}</h2>
      <p className="campaign-description">{desc}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function readSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { res({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = rej;
    img.src = url;
  });
}

function ImageDrop({ label, spec, value, onChange }: { label: string; spec: { width: number; height: number; label: string }; value: string; onChange: (u: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast.error("Use PNG, JPG or WebP.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB.");
    const { w, h } = await readSize(file);
    if (!fitsBannerSize(w, h, spec)) return toast.error(`${label} must be at least ${spec.label}. Yours is ${w} × ${h}.`);
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const path = `${u.user?.id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "png"}`;
    const { error } = await supabase.storage.from("ad-banners").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return toast.error("Upload failed. Please try again.");
    onChange(supabase.storage.from("ad-banners").getPublicUrl(path).data.publicUrl);
  };
  return (
    <label className={`campaign-upload ${value ? "campaign-upload-done" : ""}`}>
      {value ? <img src={value} alt="" className="max-h-24 w-full rounded object-contain" /> : <span className="campaign-upload-icon">{label === "Desktop banner" ? <Monitor /> : <Smartphone />}</span>}
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-sm text-muted-foreground">{spec.label} min · up to 5 MB</span>
      <span className="campaign-upload-action">{busy ? <Loader2 className="animate-spin" size={14} /> : value ? <CheckCircle2 size={14} /> : <Upload size={14} />}{busy ? "Uploading…" : value ? "Replace image" : "Choose image"}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
    </label>
  );
}

function BannerSection() {
  const [weeks, setWeeks] = useState(1);
  const checkout = useServerFn(createBannerCheckout);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [dest, setDest] = useState("https://");
  const [desktop, setDesktop] = useState("");
  const [mobile, setMobile] = useState("");
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const cents = bannerTotalCents(weeks);
  const ready = name.trim() && normalizeDestination(dest) && desktop && mobile && isValidWeeks(weeks);

  const pay = async () => {
    setBusy(true);
    try {
      const ret = new URL(window.location.href); ret.search = "";
      const r = await checkout({ data: { advertiserName: name, headline, destinationUrl: dest, desktopImageUrl: desktop, mobileImageUrl: mobile, weeks, returnUrl: ret.toString() } });
      if (r.ok) { window.location.href = r.paymentLink; return; }
      toast.error(r.reason);
    } catch { toast.error("Couldn't start checkout."); }
    setBusy(false);
  };

  const b = { advertiser_name: name, headline, destination_url: dest, desktop_image_url: desktop, mobile_image_url: mobile };
  const row = (index: number) => <div className="campaign-preview-row" aria-hidden="true"><span>{String(index).padStart(2, "0")}</span><i /><div><i /><i /></div><ExternalLink size={14} /></div>;
  const completed = [Boolean(name.trim() && normalizeDestination(dest)), Boolean(desktop && mobile), isValidWeeks(weeks)];
  const steps = ["Brand details", "Banner images", "Campaign duration"];

  return (
    <div className="campaign-workspace">
      <div className="campaign-editor">
        <div className="campaign-editor-intro"><span className="campaign-kicker"><ImageIcon size={15} /> BANNER CAMPAIGN</span><h2>Let’s put your brand out there.</h2><p>Appear on Network, Leaderboard and startup profiles.</p></div>
        <section className="campaign-form-section">
          <div className="campaign-step-title"><span>01</span><div><h3>Your brand</h3><p>Where should founders go when they click?</p></div></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="adv">Company name <span className="text-muted-foreground">*</span></label><Input id="adv" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company" /></div>
            <div><label htmlFor="alt">Image description <span className="campaign-optional">Optional</span></label><Input id="alt" maxLength={120} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Describe your banner" /><p className="campaign-field-note">For founders using screen readers.</p></div>
            <div className="sm:col-span-2"><label htmlFor="dest">Destination link <span className="text-muted-foreground">*</span></label><div className="campaign-link-field"><Globe2 size={18} /><Input id="dest" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="https://yourcompany.com" /></div><p className="campaign-field-note">Use a full https:// link. UTM tracking tags are welcome.</p></div>
          </div>
        </section>
        <section className="campaign-form-section">
          <div className="campaign-step-title"><span>02</span><div><h3>Your creative</h3><p>Two sizes. A great fit on every screen.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><ImageDrop label="Desktop banner" spec={BANNER_DESKTOP} value={desktop} onChange={setDesktop} /><ImageDrop label="Mobile banner" spec={BANNER_MOBILE} value={mobile} onChange={setMobile} /></div>
          <p className="campaign-field-note">PNG, JPG or WebP · Both images are required.</p>
        </section>
        <section className="campaign-form-section">
          <div className="campaign-step-title"><span>03</span><div><h3>Make it a week. Or a year.</h3><p>One payment. Your time starts only after approval.</p></div></div>
          <div className="campaign-duration">
            <div><label htmlFor="weeks">Campaign duration</label><div className="campaign-week-input"><Input id="weeks" type="number" min={1} max={BANNER_MAX_WEEKS} step={1} value={weeks || ""} onChange={(e) => setWeeks(Number(e.target.value))} /><span>weeks</span></div></div>
            <div className="campaign-duration-days"><strong>{isValidWeeks(weeks) ? weeks * 7 : "—"}</strong><span>days in rotation</span></div>
          </div>
          <div className="campaign-week-presets">{BANNER_WEEK_PRESETS.map((p) => <Button variant="outline" key={p} onClick={() => setWeeks(p)} aria-pressed={weeks === p}>{p} {p === 1 ? "week" : "weeks"}{weeks === p && <Check size={14} />}</Button>)}</div>
          <p className="campaign-field-note">Choose 1–52 whole weeks. Shared random rotation; views and clicks are measured, not guaranteed.</p>
        </section>
      </div>
      <aside className="campaign-preview-column" aria-label="Campaign preview and order">
        <section className="campaign-preview-tool">
          <div className="campaign-preview-heading"><span><span className="campaign-live-dot" /> Live preview</span><div className="campaign-device-switch">{(["desktop", "mobile"] as const).map((v) => <Button variant="ghost" size="icon" key={v} title={`${v === "desktop" ? "Desktop" : "Mobile"} preview`} aria-label={`${v === "desktop" ? "Desktop" : "Mobile"} preview`} aria-pressed={view === v} onClick={() => setView(v)}>{v === "desktop" ? <Monitor /> : <Smartphone />}</Button>)}</div></div>
          <div className={`campaign-preview-canvas ${view === "mobile" ? "campaign-preview-mobile" : ""}`}>
            <div className="campaign-browser-bar"><div><i /><i /><i /></div><span>startupbar.co/network</span><ShieldCheck size={12} /></div>
            <div className="campaign-preview-site"><div className="campaign-preview-brand"><span className="placement-brand-capsule" />StartupBar<span>Network</span></div>{row(5)}{row(6)}
              {(view === "desktop" ? desktop : mobile) ? <BannerCreative b={b} preview={view} onClick={() => {}} /> : <div className={`campaign-empty-banner campaign-empty-${view}`}><span className="campaign-empty-label">YOUR AD GOES HERE</span><div><span className="placement-brand-capsule" /><strong>{name.trim() || "Your next big thing."}</strong><ArrowRight /></div><small>{headline.trim() || "A little space. A big first impression."}</small></div>}
              {row(7)}
            </div>
          </div>
          <div className="campaign-placement-note"><Layers3 size={18} /><p>Between every 6 startup rows.<span>Also on Leaderboard and startup profiles.</span></p></div>
        </section>
        <section className="campaign-order" aria-label="Order summary">
          <div className="campaign-order-top"><span>YOUR CAMPAIGN</span><span><Clock3 size={14} /> Starts after approval</span></div>
          <div className="campaign-order-total"><div><strong>${(cents / 100).toLocaleString()}</strong><span>one-time payment</span></div><span>{isValidWeeks(weeks) ? `${weeks} ${weeks === 1 ? "week" : "weeks"}` : "1–52 weeks"}<small>$49 / week</small></span></div>
          <ul className="campaign-checklist">{steps.map((step, i) => <li key={step} className={completed[i] ? "is-complete" : ""}>{completed[i] ? <CheckCircle2 size={16} /> : <span className="campaign-pending-dot" />}{step}<span>{completed[i] ? "Ready" : "To complete"}</span></li>)}</ul>
          <Button onClick={pay} disabled={!ready || busy} className="campaign-pay">{busy ? <><Loader2 className="animate-spin" />Opening checkout…</> : <>Continue to payment<ArrowRight /></>}</Button>
          <p className="campaign-order-note"><ShieldCheck size={14} /> Secure checkout · No subscription</p>
          <p className="campaign-tax-note">Review time never uses your purchased days. Taxes, if applicable, appear at checkout.</p>
        </section>
      </aside>
    </div>
  );
}

function NeedsListing({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="font-semibold">List your startup first</p>
      <p className="mt-1 text-sm text-muted-foreground">{what} is for startups listed on StartupBar. Listing your first startup is free.</p>
      <Link to="/apply" className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">List my startup</Link>
    </div>
  );
}

function GoldSection() {
  const { data = [], isLoading } = useMyStartups();
  const approved = data.filter((s) => s.status === "approved");
  return (
    <Card title="Gold highlight" desc="Your startup glows gold in the lists and gets priority in the bar until every guaranteed click arrives.">
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : approved.length === 0 ? <NeedsListing what="The gold highlight" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {approved.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><span className="font-semibold">{s.name}</span><BoostClicksButton startupId={s.id} startupName={s.name} /></li>)}
        </ul>
      )}
    </Card>
  );
}

function NewsletterSection() {
  const { data = [], isLoading } = useMyStartups();
  return (
    <Card title="Sunday newsletter" desc="Be the one sponsor in our Sunday email to every founder on the network.">
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : data.length === 0 ? <NeedsListing what="The newsletter sponsorship" /> : (
        <div className="rounded-xl border border-border p-5 text-sm">
          <p>Newsletter spots are booked with a listing, and Supporters get one free from their dashboard.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/apply" className="inline-flex h-10 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground">Book with a new listing</Link>
            <Link to="/dashboard" className="inline-flex h-10 items-center rounded-full border border-border px-5 font-semibold">Open dashboard</Link>
          </div>
        </div>
      )}
    </Card>
  );
}

const STATUS: Record<string, string> = { pending_payment: "Awaiting payment", in_review: "In review", running: "Running", paused: "Paused", rejected: "Rejected", finished: "Finished" };

function CampaignsSection() {
  const { data = [], isLoading } = useQuery({ queryKey: ["my-banners"], queryFn: () => getMyBannerCampaigns() });
  return (
    <Card title="My campaigns" desc="Your banner campaigns and how they're doing.">
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : data.length === 0 ? <p className="text-sm text-muted-foreground">No banner campaigns yet.</p> : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[160px_1fr]">
              <img src={c.desktop_image_url} alt="" className="aspect-[6/1] w-full rounded object-cover" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{c.advertiser_name}</span><span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">{STATUS[c.status] ?? c.status}</span></div>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                  {c.impressions.toLocaleString()} views · {c.clicks.toLocaleString()} clicks · {c.weeks} {c.weeks === 1 ? "week" : "weeks"} · ${(c.budget_cents / 100).toLocaleString()} prepaid
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{c.starts_at && c.expires_at ? `${new Date(c.starts_at).toLocaleDateString()} – ${new Date(c.expires_at).toLocaleDateString()}` : "Your purchased time starts after payment and approval."}</p>
                {c.status === "rejected" && c.rejection_reason ? <p className="mt-1 text-sm">Reason: {c.rejection_reason}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
