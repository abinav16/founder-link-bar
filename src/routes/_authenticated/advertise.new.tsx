import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Image as ImageIcon, Loader2, Mail, Monitor, Smartphone, Sparkles, Upload } from "lucide-react";
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

  const menu: { id: Section; label: string; icon: typeof ImageIcon }[] = [
    { id: "banner", label: "Banner ad", icon: ImageIcon },
    { id: "gold", label: "Gold highlight", icon: Sparkles },
    { id: "newsletter", label: "Sunday newsletter", icon: Mail },
    { id: "campaigns", label: "My campaigns", icon: Check },
  ];

  return (
    <DashboardLayout>
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <nav className="rounded-2xl border border-border bg-card p-3" aria-label="Campaign sections">
            <h1 className="px-3 pb-3 pt-1 text-lg font-semibold">New campaign</h1>
            {menu.map((m) => (
              <Button variant="ghost" key={m.id} type="button" onClick={() => setSection(m.id)} aria-current={section === m.id ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${section === m.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <m.icon className="h-4 w-4" /> {m.label}
              </Button>
            ))}
          </nav>
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold">Need a hand?</p>
            <p className="mt-1 text-muted-foreground">Ask us about placements or timing.</p>
            <a href="mailto:hello@startupbar.co" className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full border border-foreground text-sm font-semibold">Talk to us</a>
          </div>
        </aside>
        <div className="min-w-0">
          {section === "banner" && <BannerSection onDone={() => setSection("campaigns")} />}
          {section === "gold" && <GoldSection />}
          {section === "newsletter" && <NewsletterSection />}
          {section === "campaigns" && <CampaignsSection />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
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
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-5 text-center hover:border-foreground/40">
      {value ? <img src={value} alt="" className="max-h-24 w-full rounded object-contain" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground">{spec.label} min · up to 5 MB</span>
      <span className="text-xs font-medium underline">{busy ? "Uploading…" : value ? "Replace" : "Upload"}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
    </label>
  );
}

function BannerSection({ onDone }: { onDone: () => void }) {
  void onDone;
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
  const row = (w: string) => <div className="flex items-center gap-3 rounded-lg border border-border p-3"><div className="h-7 w-7 shrink-0 rounded-md bg-muted" /><div className={`h-2 rounded bg-muted ${w}`} /></div>;

  return (
    <div className="space-y-6">
      <Card title="Banner ad" desc="Shown between startups on Network and Leaderboard, and on startup profiles. Open to any company.">
        <div className="grid gap-0 overflow-hidden rounded-xl border border-border sm:grid-cols-[260px_1fr]">
          <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
            <label className="text-sm font-semibold" htmlFor="weeks">Campaign duration</label>
            <div className="mt-2 flex items-center gap-3">
              <Input id="weeks" type="number" min={1} max={BANNER_MAX_WEEKS} step={1} value={weeks || ""} onChange={(e) => setWeeks(Number(e.target.value))} className="text-lg" /><span className="text-sm text-muted-foreground">weeks</span></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BANNER_WEEK_PRESETS.map((p) => <Button variant="outline" size="sm" key={p} type="button" onClick={() => setWeeks(p)} aria-pressed={weeks === p} className={`h-8 px-2 text-xs ${weeks === p ? "border-foreground font-semibold" : "border-border"}`}>{p}w</Button>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
            <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Per week</p><p className="text-xl font-semibold">$49</p></div>
            <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Duration</p><p className="text-xl font-semibold tabular-nums">{isValidWeeks(weeks) ? weeks * 7 : "—"} days</p></div>
            <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</p><p className="text-xl font-semibold">${(cents / 100).toLocaleString()}</p></div>
            <p className="col-span-full text-xs text-muted-foreground">1–52 weeks. Paid once; no subscription. Starts after approval and runs in shared random rotation. Views and clicks are measured, not guaranteed.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><label className="text-sm font-semibold" htmlFor="adv">Company name</label><Input id="adv" className="mt-2" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="text-sm font-semibold" htmlFor="alt">Short description <span className="font-normal text-muted-foreground">(for screen readers)</span></label><Input id="alt" className="mt-2" maxLength={120} value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="text-sm font-semibold" htmlFor="dest">Destination link</label><Input id="dest" className="mt-2" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="https://yoursite.com/?utm_source=startupbar" />
            <p className="mt-1 text-xs text-muted-foreground">Full https:// link. Add UTM tags to track visits in your analytics.</p></div>
          <ImageDrop label="Desktop banner" spec={BANNER_DESKTOP} value={desktop} onChange={setDesktop} />
          <ImageDrop label="Mobile banner" spec={BANNER_MOBILE} value={mobile} onChange={setMobile} />
        </div>
      </Card>

      <Card title="Preview" desc="How your banner looks inside the startup list.">
        <div className="mb-4 inline-flex rounded-full border border-border p-1">
          {(["desktop", "mobile"] as const).map((v) => (
            <Button variant="ghost" key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${view === v ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {v === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />} {v === "desktop" ? "Desktop" : "Mobile"}
            </Button>
          ))}
        </div>
        <div className={`mx-auto space-y-2 rounded-2xl border border-border bg-background p-3 ${view === "mobile" ? "max-w-[340px]" : ""}`}>
          {row("w-40")}{row("w-28")}
          <BannerCreative b={b} preview={view} onClick={(() => {}) as () => void} />
          {row("w-32")}{row("w-24")}
        </div>
      </Card>

      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-muted-foreground">Due today · one-time payment</p><p className="text-2xl font-semibold">${(cents / 100).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{isValidWeeks(weeks) ? `${weeks} ${weeks === 1 ? "week" : "weeks"} at $49/week. ` : "Choose 1–52 whole weeks. "}Review time does not use your purchased days. Taxes, if applicable, appear at checkout.</p></div>
        <Button onClick={pay} disabled={!ready || busy} className="h-11 rounded-full px-6">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay & submit for review"}</Button>
      </div>
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
