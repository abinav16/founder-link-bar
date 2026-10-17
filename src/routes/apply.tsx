import { SUPPORTER_PRICE_USD, SUPPORTER_TRIAL_DAYS } from "@/lib/supporter";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StartupFavicon } from "@/components/StartupFavicon";
import { trackFunnel } from "@/lib/funnel";
import { SitePreviewSurface } from "@/components/SitePreviewSurface";

import {
  ArrowRight, ArrowLeft, ExternalLink,
  Copy, Check, CheckCircle2, XCircle, Loader2, ShieldAlert, ChevronDown,
  Sparkles, EyeOff, Globe2, ChartNoAxesCombined, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";


export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Apply — StartupBar" },
      { name: "description", content: "Submit your startup to join the StartupBar network. Get featured on other founders' sites and grow together through free traffic exchange." },
      { property: "og:title", content: "Apply — StartupBar" },
      { property: "og:description", content: "Submit your startup to join the StartupBar network and get featured on other founders' sites." },
      { property: "og:url", content: "https://startupbar.co/apply" },
    ],
    links: [{ rel: "canonical", href: "/apply" }],
  }),
  ssr: false,
  component: Apply,
});

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  website_url: z.string().trim().url().max(200),
  description: z.string().trim().min(10).max(100),
  founder_quote: z.string().trim().max(280).optional(),
});

function BarPreview({ name, url, desc, placement = "top", noBar = false }: { name: string; url: string; desc: string; placement?: "top" | "bottom"; noBar?: boolean }) {
  const displayName = name || "Your Startup";
  const displayDesc = desc || "Your one-liner goes here";
  const favicon = url ? `https://www.google.com/s2/favicons?domain=${url}&sz=32` : null;

  // Live site preview: as soon as what's typed looks like a real domain, load
  // the actual site inside the mock window (same behaviour as the home hero).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    const raw = (url || "").trim().replace(/^@/, "").replace(/\s+/g, "");
    if (!raw) { setPreviewUrl(null); return; }
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let host = "";
    let href = "";
    try {
      const u = new URL(withProto);
      host = u.hostname;
      href = u.toString();
    } catch { return; }
    if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/i.test(host)) return;
    const t = window.setTimeout(() => setPreviewUrl(href), 250);
    return () => window.clearTimeout(t);
  }, [url]);

  const previewHost = (() => {
    if (!previewUrl) return "somefounder.com";
    try { return new URL(previewUrl).hostname.replace(/^www\./, ""); } catch { return "somefounder.com"; }
  })();

  const bar = (
    <div
      className={`flex h-9 items-center gap-2.5 bg-white px-4 ${placement === "top" ? "border-b" : "border-t"} border-black/6`}
    >
      <span className="rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-white">STARTUPBAR</span>
      {favicon && <img src={favicon} alt="" className="h-4 w-4 rounded-sm object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
      <span className="shrink-0 text-[13px] font-medium text-black">{displayName}</span>
      <span className="hidden truncate text-[12px] text-black/40 sm:block">· {displayDesc}</span>
      <span className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-black/50">Visit <ExternalLink className="h-3 w-3" /></span>
    </div>
  );
  return (
    <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex h-8 items-center gap-1.5 border-b border-black/6 bg-black/[0.02] px-3">
        <div className="h-2 w-2 rounded-full bg-red-400/70" />
        <div className="h-2 w-2 rounded-full bg-yellow-400/70" />
        <div className="h-2 w-2 rounded-full bg-green-400/70" />
        <div className="ml-2 truncate text-[10px] text-black/25">{previewHost}</div>
      </div>
      {!noBar && placement === "top" && bar}
      <div className="relative h-[260px] w-full overflow-hidden">
        {previewUrl ? (
          <SitePreviewSurface url={previewUrl} heightCls="h-[260px]" />
        ) : (
          <div className="space-y-2 px-4 py-6">
            <div className="h-3 w-2/3 rounded-full bg-black/5" />
            <div className="h-3 w-1/2 rounded-full bg-black/5" />
            <div className="mt-4 h-3 w-full rounded-full bg-black/5" />
            <div className="h-3 w-5/6 rounded-full bg-black/5" />
            <div className="h-3 w-4/6 rounded-full bg-black/5" />
          </div>
        )}
        {noBar && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
            <div className="sb-no-bar-label absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-black/10 bg-white/95 px-6 py-3 text-lg font-bold text-black shadow-lg backdrop-blur-sm">No Bar</span>
            </div>
            <div className="sb-confetti-burst absolute inset-0">
              {Array.from({ length: 18 }, (_, index) => <span key={index} className="sb-confetti-piece" />)}
            </div>
          </div>
        )}
      </div>
      {!noBar && placement === "bottom" && bar}
    </div>
  );
}

const supporterSlides = [
  {
    icon: EyeOff,
    eyebrow: "Your site stays yours",
    title: "You don’t have to display a widget or bar.",
    body: "Nothing appears to your visitors. No layout changes, no extra space and no visual distraction.",
  },
  {
    icon: Globe2,
    eyebrow: "Visibility included",
    title: "Your startup still appears across the network.",
    body: "Get a fair, average member’s share of exposure without placing StartupBar on your own website.",
  },
  {
    icon: ChartNoAxesCombined,
    eyebrow: "Analytics are optional",
    title: "Unlock your visitor insights when you’re ready.",
    body: "Add one invisible line of code for your visitor map and on-site stats—or skip it and keep your listing active.",
  },
  {
    icon: Sparkles,
    eyebrow: "You stand out",
    title: "Your listing gets the gold highlight.",
    body: "Supporters glow gold on the network page and the leaderboard, the same highlight featured startups get.",
  },
  {
    icon: RefreshCw,
    eyebrow: "Always flexible",
    title: "Change your mind at any time.",
    body: "Switch to the free bar whenever you like. Cancelling stops renewal while your paid year continues.",
  },
] as const;

function SupporterStory() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % supporterSlides.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [paused]);

  const show = (index: number) => setActive((index + supporterSlides.length) % supporterSlides.length);
  const slide = supporterSlides[active];
  const Icon = slide.icon;

  return (
    <section
      className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_18px_50px_-30px_rgba(0,0,0,0.28)]"
      aria-label="Supporter membership benefits"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-black/8 bg-black/[0.018] px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase text-black/35 sm:text-[11px]">Supporter membership</p>
          <h3 className="mt-0.5 truncate text-base font-semibold text-black sm:text-lg">Supporter — ${SUPPORTER_PRICE_USD} / year</h3>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-700/15 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase text-emerald-800">No bar</span>
      </div>

      <div
        className="relative min-h-[230px] px-4 pb-5 pt-5 sm:min-h-[224px] sm:px-6 sm:pt-6"
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) > 40) show(active + (dx < 0 ? 1 : -1));
        }}
      >
        <div key={active} className="sb-supporter-slide">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.035] sm:h-11 sm:w-11">
            <Icon className="h-5 w-5 text-black/70" aria-hidden="true" />
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase text-black/35 sm:mt-5">{slide.eyebrow}</p>
          <h4 className="mt-1.5 max-w-md text-[17px] font-semibold leading-snug text-black sm:text-xl">{slide.title}</h4>
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-black/50">{slide.body}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-black/8 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a benefit">
          {supporterSlides.map((item, index) => (
            <button
              key={item.eyebrow}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-label={`Show benefit ${index + 1}: ${item.eyebrow}`}
              onClick={() => show(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${active === index ? "w-7 bg-black" : "w-1.5 bg-black/15 hover:bg-black/30"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => show(active - 1)} aria-label="Previous benefit" className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-black">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-9 text-center text-[11px] tabular-nums text-black/30">{active + 1} / {supporterSlides.length}</span>
          <button type="button" onClick={() => show(active + 1)} aria-label="Next benefit" className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-black">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}


function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-black">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-black/40">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-black/12 bg-white px-4 py-3 text-sm text-black placeholder:text-black/45 outline-none ring-0 transition focus:border-black/30 focus:ring-2 focus:ring-black/8";

function CopyableCode({ code, label = "HTML", tone = "neutral" }: { code: string; label?: string; tone?: "neutral" | "red" }) {
  const [copied, setCopied] = useState(false);
  const toneCls = tone === "red"
    ? "border-red-200 bg-red-50/60"
    : "border-black/10 bg-black/[0.025]";
  const headerCls = tone === "red" ? "border-red-200 text-red-700/60" : "border-black/8 text-black/30";
  const preCls = tone === "red" ? "text-red-900/80" : "text-black/60";
  return (
    <div className={`overflow-hidden rounded-lg border ${toneCls}`}>
      <div className={`flex items-center justify-between border-b px-3 py-1.5 ${headerCls}`}>
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium hover:bg-black/5 transition-colors"
        >
          {copied ? <><Check className="h-3 w-3 text-emerald-500" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <div className="overflow-x-auto px-3 py-2.5">
        <pre className={`whitespace-pre font-mono text-[11.5px] leading-relaxed ${preCls}`}>{code}</pre>
      </div>
    </div>
  );
}

/** "Copy prompt" card for non-technical users who build with an AI agent (Lovable, Cursor, v0…). */
function AgentPromptCard({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-start gap-3 rounded-lg border border-black/8 bg-black/[0.015] px-4 py-3.5">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-black/35" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-black">Let your AI agent install it</p>
        <p className="mt-0.5 text-xs text-black/45">
          Using Lovable, Cursor, Claude Code or another AI builder? Copy the prompt your agent installs the code for you. Just publish your site afterwards so we can verify the install.
        </p>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-black/[0.04]"
      >
        {copied ? <><Check className="h-3 w-3 text-emerald-500" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy prompt</>}
      </button>
    </div>
  );
}

function GuideItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-black/8 bg-black/[0.015] open:bg-white transition-colors">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-black">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-black/40 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-black/8 px-4 py-3.5 text-[13px] leading-relaxed text-black/65 space-y-1.5">
        {children}
      </div>
    </details>
  );
}


const DRAFT_KEY = "startupbar:apply-draft";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The draft lives in localStorage so it survives the Dodo payment round-trip
// (new tab, restored session, coming back later). sessionStorage is still read
// as a fallback for anyone mid-flow when this shipped.
function readRawDraft(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DRAFT_KEY) ?? sessionStorage.getItem(DRAFT_KEY);
  } catch { return null; }
}

function writeDraft(value: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(value)); } catch { /* ignore */ }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

// Install IDs are pinned per site host and survive draft clears / failed
// attempts. Without this, a second attempt generated a fresh UUID while the
// founder's site still had the first snippet installed -> "Wrong ID" in admin.
const INSTALL_IDS_KEY = "startupbar:install-ids";

function hostKey(rawUrl: string): string {
  const t = rawUrl.trim();
  if (!t) return "";
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch { return ""; }
}

function readInstallIds(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(INSTALL_IDS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

// Returns the pinned install ID for this host, creating (and persisting) one
// the first time. Falls back to `fallback` when the URL isn't parseable yet.
function pinnedInstallId(rawUrl: string, fallback: string): string {
  const key = hostKey(rawUrl);
  if (!key) return fallback;
  const map = readInstallIds();
  if (map[key] && UUID_RE.test(map[key])) return map[key];
  map[key] = fallback;
  try { localStorage.setItem(INSTALL_IDS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
  return fallback;
}

function readDraft(): { step: 1 | 2; name: string; url: string; desc: string; startupId: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readRawDraft();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const sid = typeof parsed.startupId === "string" && UUID_RE.test(parsed.startupId) ? parsed.startupId : "";
    return {
      step: parsed.step === 2 ? 2 : 1,
      name: parsed.name ?? "",
      url: parsed.url ?? "",
      desc: parsed.desc ?? "",
      startupId: sid,
    };
  } catch { return null; }
}


function readInitialFromUrl() {
  if (typeof window === "undefined") return { step: 1 as 1 | 2, name: "", url: "", desc: "", paid: false, paymentId: "", resubmitId: "", startupId: "" };
  const p = new URLSearchParams(window.location.search);
  const draft = readDraft();
  const urlSid = p.get("sid") ?? "";
  const sidFromUrl = UUID_RE.test(urlSid) ? urlSid : "";
  if (p.get("paid") === "true") {
    // On return from Dodo, prefer sessionStorage draft over URL params so
    // we don't need to leak PII (name/url/desc) through the return URL.
    return {
      step: 2 as 1 | 2,
      name: draft?.name ?? p.get("name") ?? "",
      url: draft?.url ?? p.get("url") ?? "",
      desc: draft?.desc ?? p.get("desc") ?? "",
      paid: true,
      paymentId: p.get("payment_id") ?? "",
      resubmitId: "",
      startupId: sidFromUrl || draft?.startupId || "",
    };
  }
  const resubmitId = p.get("resubmit") ?? "";
  if (resubmitId) {
    return { step: 2 as 1 | 2, name: "", url: "", desc: "", paid: false, paymentId: "", resubmitId, startupId: "" };
  }
  if (draft) {
    return { step: draft.step, name: draft.name, url: draft.url || (p.get("url") ?? ""), desc: draft.desc, paid: false, paymentId: "", resubmitId: "", startupId: draft.startupId };
  }
  // No draft and no URL param: fall back to a site stashed before sign-in
  // (set on the landing page when a logged-out visitor hit the arrow).
  let pendingUrl = p.get("url") ?? "";
  if (!pendingUrl) {
    try {
      pendingUrl = sessionStorage.getItem("startupbar:apply-url") ?? "";
      if (pendingUrl) sessionStorage.removeItem("startupbar:apply-url");
    } catch { /* ignore */ }
  }
  return { step: 1 as 1 | 2, name: "", url: pendingUrl, desc: "", paid: false, paymentId: "", resubmitId: "", startupId: "" };
}


function Apply() {
  const navigate = useNavigate();
  const initial = (typeof window !== "undefined" ? readInitialFromUrl() : { step: 1 as 1 | 2, name: "", url: "", desc: "", paid: false, paymentId: "", resubmitId: "", startupId: "" });
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [step, setStep] = useState<1 | 2>(initial.step);
  const [name, setName] = useState(initial.name);
  const [url, setUrl] = useState(initial.url);
  const [desc, setDesc] = useState(initial.desc);
  const [quote, setQuote] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return JSON.parse(readRawDraft() ?? "{}")?.quote ?? ""; } catch { return ""; }
  });
  const [placement, setPlacement] = useState<"top" | "bottom">(() => {
    if (typeof window === "undefined") return "top";
    try { return JSON.parse(readRawDraft() ?? "{}")?.placement === "bottom" ? "bottom" : "top"; } catch { return "top"; }
  });
  // "widget" = show the bar on your own site (free). "supporter" = pay yearly
  // instead of showing the bar; the snippet is optional and only powers the
  // founder's own dashboard stats.
  const [mode, setMode] = useState<"widget" | "supporter">(() => {
    if (typeof window === "undefined") return "widget";
    try { return JSON.parse(readRawDraft() ?? "{}")?.mode === "supporter" ? "supporter" : "widget"; } catch { return "widget"; }
  });
  const isSupporter = mode === "supporter";

  const [resubmitId, setResubmitId] = useState<string>(initial.resubmitId);
  const [startupId, setStartupId] = useState<string>(() => initial.resubmitId || initial.startupId || crypto.randomUUID());
  const [copied, setCopied] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "live" | "csp" | "csp-frame" | "csp-img" | "not-found" | "error">("idle");
  const [verifyMsg, setVerifyMsg] = useState("");

  const [loading, setLoading] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [hasPrepaid, setHasPrepaid] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(initial.paid && !!initial.paymentId);
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);
  // True when a payment came back verified but we have no usable draft to submit.
  const [paidNeedsForm, setPaidNeedsForm] = useState(false);

  // Reuse the same install ID for a given site across attempts/sessions, so the
  // snippet the founder already pasted keeps matching their listing.
  useEffect(() => {
    if (resubmitId) return;
    const pinned = pinnedInstallId(url, startupId);
    if (pinned !== startupId) setStartupId(pinned);
  }, [url, resubmitId, startupId]);


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  // Funnel breadcrumbs: without these, an application that is started and
  // abandoned leaves no trace at all.
  useEffect(() => { trackFunnel("apply_opened"); }, []);
  useEffect(() => { trackFunnel("apply_step", { step, name, url }); }, [step, name, url]);

  // Never allow step 2 without an authenticated session — it gates the script + submission.
  useEffect(() => {
    if (authed === false && step === 2) setStep(1);
  }, [authed, step]);


  async function refreshGateData(userId: string) {
    const [{ count }, { data: prepaid }] = await Promise.all([
      supabase.from("startups").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "rejected"),
      supabase.from("payments").select("id").eq("user_id", userId).eq("status", "succeeded").is("consumed_at", null).limit(1),
    ]);
    setExistingCount(count ?? 0);
    setHasPrepaid((prepaid?.length ?? 0) > 0);
  }

  useEffect(() => {
    if (!authed) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) refreshGateData(data.user.id);
    });
  }, [authed]);

  // Load existing rejected startup when resubmitting: fills form + reuses same startup ID/embed.
  useEffect(() => {
    if (!authed || !resubmitId) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data, error } = await supabase
        .from("startups")
        .select("id, name, website_url, description, founder_quote, widget_placement, status, user_id")
        .eq("id", resubmitId)
        .maybeSingle();
      if (error || !data || data.user_id !== u.user.id) {
        setResubmitId("");
        setStep(1);
        window.history.replaceState({}, "", "/apply");
        toast.error("Couldn't load that startup for resubmission.");
        return;
      }
      if (data.status !== "rejected") {
        setResubmitId("");
        setStep(1);
        window.history.replaceState({}, "", "/apply");
        toast.info("That startup isn't rejected — no resubmission needed.");
        return;
      }
      setName(data.name);
      setUrl(data.website_url);
      setDesc(data.description);
      setQuote(data.founder_quote ?? "");
      setPlacement(data.widget_placement === "bottom" ? "bottom" : "top");
      setStartupId(data.id);
      setStep(2);
      // Script was already installed for this ID — verify automatically with the fetched URL.
      checkInstallation(data.website_url);
    })();
  }, [authed, resubmitId]);

  // Verify payment server-side once on return from Dodo, then auto-submit.
  // Retries a few times because Dodo can be a beat slow to mark succeeded,
  // and the webhook is the authoritative fallback if this path fails.
  useEffect(() => {
    if (!initial.paid) return;
    if (!initial.paymentId) {
      window.history.replaceState({}, "", "/apply");
      setVerifyingPayment(false);
      return;
    }
    let cancelled = false;
    (async () => {
      let ok = false;
      for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
        const { data, error } = await supabase.functions.invoke("verify-dodo-payment", {
          body: { payment_id: initial.paymentId },
        });
        if (cancelled) return;
        if (!error && data?.ok) { ok = true; break; }
        // Backoff: 1.5s, 3s, 4.5s, 6s.
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      if (cancelled) return;
      // Even when our own verification didn't confirm in time, the Dodo webhook
      // may have already recorded the payment — refresh and let the auto-submit
      // path (which polls for the credit) decide.
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await refreshGateData(u.user.id).catch(() => {});
      window.history.replaceState({}, "", "/apply");
      setVerifyingPayment(false);
      if (!ok) {
        toast.info(
          "Payment received — finishing your listing. This can take a few seconds.",
          { duration: 6000 },
        );
      }
      setAutoSubmitPending(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After payment is verified, auto-submit — but never fail silently.
  useEffect(() => {
    if (!autoSubmitPending) return;
    if (loading) return;

    // No usable draft (lost across the payment round-trip) — don't attempt a
    // doomed submit; send them back to step 1 with a recovery banner.
    if (!name.trim() || !url.trim() || !desc.trim()) {
      setAutoSubmitPending(false);
      setPaidNeedsForm(true);
      setStep(1);
      return;
    }

    if (hasPrepaid) {
      setAutoSubmitPending(false);
      onSubmit();
      return;
    }

    // Credit not visible yet (webhook race) — poll briefly, then stop with a
    // clear message instead of waiting forever.
    let stopped = false;
    const poll = setInterval(async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!stopped && u.user) await refreshGateData(u.user.id).catch(() => {});
    }, 3000);
    const timeout = setTimeout(() => {
      stopped = true;
      clearInterval(poll);
      setAutoSubmitPending(false);
      setPaidNeedsForm(true);
      toast.info("Payment received. Hit Submit to finish — you won't be charged again.", {
        duration: 10000,
      });
    }, 18000);
    return () => { stopped = true; clearInterval(poll); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitPending, hasPrepaid, loading, name, url, desc]);


  // Return from the supporter checkout: create the listing, then confirm the
  // subscription so the paid year lands on it.
  const supporterHandled = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !authed || supporterHandled.current) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("supporter") !== "1") return;
    const subId = p.get("subscription_id") ?? "";
    supporterHandled.current = true;
    window.history.replaceState({}, "", "/apply");
    if (!subId) return;
    if (!name.trim() || !url.trim() || !desc.trim()) {
      setPaidNeedsForm(true);
      setStep(1);
      return;
    }
    setMode("supporter");
    onSubmit({ supporterSubscriptionId: subId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, name, url, desc]);

  // Persist draft so the form survives the sign-in round-trip.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (resubmitId) return; // resubmits are URL-driven — don't overwrite the fresh-apply draft
    if (!name && !url && !desc && !quote) return;
    writeDraft({ step, name, url, desc, quote, placement, mode, startupId });
  }, [step, name, url, desc, quote, placement, mode, resubmitId]);

  // Supporters get a tracking-only snippet: it renders nothing, no bar, no
  // layout shift — it only powers their own dashboard stats.
  const snippet = isSupporter
    ? `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${startupId}" data-mode="track"></script>`
    : `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${startupId}"></script>`;

  // Ready-to-paste prompt for founders who build with an AI agent (Lovable, Cursor, v0…).
  const agentPrompt = isSupporter
    ? [
        "Add the StartupBar analytics snippet to my website.",
        "",
        "1. Paste this script tag inside the <head> tag of every page:",
        `   ${snippet}`,
        "",
        "2. It renders nothing on the page — no bar, no banner, no layout change.",
        "   Do NOT add any CSS, padding or offsets for it.",
        "",
        "3. If the site has a Content-Security-Policy, add:",
        "   script-src https://startupbar.co;",
        "",
        "4. Do not change anything else on the site.",
        "",
        "IMPORTANT: Make sure to publish the website after installing the code.",
        "Publishing is required so the installation can be detected and verified.",
      ].join("\n")
    : [
    "Add the StartupBar widget to my website.",
    "",
    "1. Paste this script tag inside the <head> tag of every page:",
    `   ${snippet}`,
    "",
    ...(placement === "bottom"
      ? [
          "2. The widget is a 36px bar pinned to the very bottom of the page. It reserves",
          "   its own space automatically, so do NOT add any extra CSS, padding or offsets.",
          "   Only make sure nothing else of mine is fixed to the bottom of the screen",
          "   (cookie banners, chat bubbles); if something is, lift it by 36px.",
        ]
      : [
          "2. The widget is a 36px bar pinned to the very top of the page. The loader already",
          "   shifts most fixed/sticky headers down automatically. Only if my header still",
          "   hides behind the bar, push it down by 36px (e.g. header { top: 36px }).",
        ]),
    "",
    "3. If the site has a Content-Security-Policy, add these directives:",
    "   script-src https://startupbar.co;",
    "   frame-src https://startupbar.co;",
    "   img-src 'self' data: https://www.google.com https://*.googleusercontent.com;",
    "",
    "4. Do not change anything else on the site.",
  ].join("\n");


  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, website_url: url, description: desc, founder_quote: quote });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (!authed) {
      // Save draft at step 1 — user must sign in before reaching the install step.
      writeDraft({ step: 1, name, url, desc, quote, placement, mode, startupId });
      sessionStorage.setItem("startupbar:auth-next", "/apply");
      navigate({ to: "/auth" });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePayment() {
    setPaymentLoading(true);
    // Persist the draft so we can restore state after Dodo redirects back —
    // we deliberately keep the return URL tiny (no PII in query string).
    writeDraft({ step: 2, name, url, desc, quote, placement, mode, startupId });

    const { data: u } = await supabase.auth.getUser();
    const returnUrl = `${window.location.origin}/apply?paid=true&sid=${encodeURIComponent(startupId)}`;
    const { data, error } = await supabase.functions.invoke("create-dodo-checkout", {
      body: { email: u.user?.email, name: u.user?.user_metadata?.full_name, return_url: returnUrl },
    });
    setPaymentLoading(false);
    if (error || !data?.payment_link) {
      toast.error("Could not create payment session. Please try again.");
      return;
    }
    window.location.href = data.payment_link;
  }

  // Supporter membership: $999/year annual subscription. The listing row is
  // created after the buyer returns, then the subscription is confirmed and
  // stamped onto it.
  async function handleSupporterPayment() {
    setPaymentLoading(true);
    writeDraft({ step: 2, name, url, desc, quote, placement, mode: "supporter", startupId });

    const { data: u } = await supabase.auth.getUser();
    const returnUrl = `${window.location.origin}/apply?supporter=1&sid=${encodeURIComponent(startupId)}`;
    const { data, error } = await supabase.functions.invoke("create-dodo-checkout", {
      body: {
        kind: "supporter",
        startup_id: startupId,
        email: u.user?.email,
        name: u.user?.user_metadata?.full_name,
        return_url: returnUrl,
      },
    });
    setPaymentLoading(false);
    if (error || !data?.payment_link) {
      toast.error("Could not create payment session. Please try again.");
      return;
    }
    window.location.href = data.payment_link;
  }


  async function checkInstallation(targetUrl?: string) {
    const checkUrl = (targetUrl ?? url).trim();
    if (!checkUrl) return;
    setVerifyStatus("checking");
    setVerifyMsg("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      let token = sess.session?.access_token;
      // getSession() can race with hydration on hard refresh; getUser()
      // awaits it and yields a real session if there is one.
      if (!token) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) token = (await supabase.auth.getSession()).data.session?.access_token;
      }
      const res = await fetch(`/api/public/verify-install?url=${encodeURIComponent(checkUrl)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        setVerifyStatus("error");
        setVerifyMsg("Session expired — please sign in again and retry the check.");
        return;
      }

      const json = await res.json();
      if (json.installed && json.cspFrameBlocked) {
        setVerifyStatus("csp-frame");
        setVerifyMsg("Your script loads, but your CSP is blocking the StartupBar iframe. Visitors see a broken frame where the bar should be.");
      } else if (json.installed && json.cspBlocked) {
        setVerifyStatus("csp");
        setVerifyMsg("Your site's Content-Security-Policy is blocking startupbar.co. Add the directives below and re-check.");
      } else if (json.installed && json.cspImgBlocked) {
        setVerifyStatus("csp-img");
        setVerifyMsg("Widget is live, but your CSP restricts external images — the featured startup's favicon may not render.");
      } else if (json.installed) {
        setVerifyStatus("live");
        setVerifyMsg("Script detected and running on your site.");
      } else if (json.error) {
        setVerifyStatus("error");
        setVerifyMsg(json.error);
      } else {
        setVerifyStatus("not-found");
        setVerifyMsg("Not found yet — paste the snippet in your <head> and try again.");
      }
    } catch {
      setVerifyStatus("error");
      setVerifyMsg("Could not reach verification service.");
    }

  }

  async function onSubmit(opts?: { supporterSubscriptionId?: string }) {
    const supporterSub = opts?.supporterSubscriptionId;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) { setLoading(false); navigate({ to: "/auth" }); return; }

      const validated = schema.safeParse({ name, website_url: url, description: desc, founder_quote: quote });
      if (!validated.success) {
        setLoading(false);
        setStep(1);
        toast.error(validated.error.issues[0]?.message ?? "Please fill in your startup details.");
        return;
      }
      const parsed = validated.data;
      const payload = { ...parsed, founder_quote: quote.trim() || null, widget_placement: placement };

      // Duplicate guard: the same listing can come back here twice (a second
      // payment, a refreshed return URL, a re-run auto-submit). Detect it
      // before consuming a credit or hitting the primary-key conflict, and
      // tell the founder plainly what happened to their money.
      async function handleDuplicate() {
        const { data: unconsumed } = await supabase
          .from("payments")
          .select("id")
          .eq("user_id", user_id!)
          .eq("status", "succeeded")
          .is("consumed_at", null)
          .limit(1);
        clearDraft();
        setLoading(false);
        setPaidNeedsForm(false);
        if ((unconsumed?.length ?? 0) > 0) {
          toast.success("Payment successful — but this startup is already submitted.", {
            description:
              "You haven't been charged twice for the same listing. The extra payment is saved as credit for your next listing, and we'll refund it on request — just reply to your receipt email.",
            duration: 12000,
          });
        } else {
          toast.info("This startup is already submitted.", {
            description: "We review every application within 24 hours — no need to submit again.",
            duration: 8000,
          });
        }
        navigate({ to: "/dashboard" });
      }

      if (!resubmitId) {
        const { data: dupe } = await supabase
          .from("startups")
          .select("id")
          .eq("user_id", user_id)
          .or(`id.eq.${startupId},website_url.eq.${parsed.website_url}`)
          .limit(1);
        if ((dupe?.length ?? 0) > 0) {
          await handleDuplicate();
          return;
        }
      }

      // Resubmit path: update the existing rejected row back to pending — no new row, no payment gate.
      if (resubmitId) {
        const { error: updErr } = await supabase
          .from("startups")
          .update({ ...payload, status: "pending", rejection_reason: null })
          .eq("id", resubmitId)
          .eq("user_id", user_id);
        setLoading(false);
        if (updErr) { toast.error(updErr.message); return; }
      } else {
        // If this is a paid additional listing, atomically consume one prepaid slot first.
        // Supporter memberships are paid separately, so they skip this gate.
        if (existingCount >= 1 && !supporterSub) {
          const { data: consumedId, error: consumeErr } = await supabase.rpc(
            "consume_prepaid_listing",
            { _user_id: user_id },
          );
          if (consumeErr || !consumedId) {
            setLoading(false);
            toast.error("No prepaid listing available. Please complete payment.");
            return;
          }
        }

        const { error } = await supabase.from("startups").insert(
          { id: startupId, user_id, ...payload }
        );
        if (error) {
          const isDupe = (error as { code?: string }).code === "23505" ||
            /duplicate key value/i.test(error.message);
          if (isDupe) { await handleDuplicate(); return; }
          setLoading(false);
          toast.error(error.message);
          return;
        }
        setLoading(false);
      }

      // Supporter: stamp the paid year onto the listing we just created.
      if (supporterSub) {
        const { data: conf, error: confErr } = await supabase.functions.invoke("create-dodo-checkout", {
          body: { action: "confirm_supporter", subscription_id: supporterSub, startup_id: startupId },
        });
        if (confErr || (!conf?.activated && !conf?.pending)) {
          toast.info("Checkout completed — we're confirming your Supporter membership.", { duration: 8000 });
        }
      }


      supabase.functions.invoke("send-email", { body: { type: "startup-submitted", data: { email: userData.user!.email, name: userData.user!.user_metadata?.full_name ?? "", startupName: parsed.name } } }).catch(() => {});
      supabase.functions.invoke("send-email", { body: { type: "admin-new-application", data: { startupName: parsed.name, startupUrl: parsed.website_url, description: parsed.description, applicantEmail: userData.user!.email } } }).catch(() => {});

      clearDraft();
      setPaidNeedsForm(false);
      toast.success("Application submitted!", {
        description: "We review every application within 24 hours. You'll get an email once you're approved.",
        duration: 6000,
        action: {
          label: "Go to dashboard",
          onClick: () => navigate({ to: "/dashboard" }),
        },
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }


  const finalizing = verifyingPayment || autoSubmitPending || (loading && (hasPrepaid || paidNeedsForm));

  return (
    <div className="min-h-dvh bg-white text-black">
      {finalizing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/92 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black" />
            <p className="text-lg font-semibold tracking-tight">
              {verifyingPayment ? "Confirming your payment…" : "Finishing your application…"}
            </p>
            <p className="mt-2 text-sm text-black/55">
              Payment received. Hold on a few seconds — we're submitting your listing and taking you to your dashboard. Don't close this tab.
            </p>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-black/8 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 sb-press">
            <div className="h-2 w-6 rounded-sm bg-black" />
            <span className="text-base font-semibold tracking-tight">StartupBar</span>
          </Link>

          <div className="hidden items-center gap-3 text-sm sm:flex">
            {[
              { n: 1 as const, label: "Details" },
              { n: 2 as const, label: "Install" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-3">
                {i > 0 && <span className="h-px w-8 bg-black/10" />}
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300 ${
                      step === s.n ? "bg-black text-white" : step > s.n ? "bg-black/80 text-white" : "bg-black/10 text-black/40"
                    }`}
                  >
                    {step > s.n ? "✓" : s.n}
                  </span>
                  <span className={`text-[13px] transition-colors duration-300 ${step === s.n ? "font-medium text-black" : "text-black/40"}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm sm:hidden">
            <span className="text-[12px] font-medium text-black/50">Step {step} of 2</span>
          </div>

          {authed ? (
            <Link to="/dashboard" className="text-sm text-black/40 hover:text-black transition-colors sb-press">Dashboard →</Link>
          ) : (
            <Link to="/auth" className="text-sm text-black/40 hover:text-black transition-colors sb-press">
              <span className="hidden sm:inline">Already a member? </span>Sign in
            </Link>
          )}
        </div>
        <div className="h-0.5 w-full bg-black/[0.06]">
          <div
            className="h-full bg-black transition-[width] duration-500 ease-out"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </header>


      <main>
      {(hasPrepaid || paidNeedsForm) && !resubmitId && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm leading-relaxed text-emerald-900">
              <span className="font-medium">Your payment went through.</span>{" "}
              Finish your listing below to use it — you won't be charged again.
            </p>
          </div>
        </div>
      )}

      {step === 1 && (

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-14">
          <div className="grid gap-10 md:grid-cols-2 md:gap-24">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Step 1 of 2</span>
              <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
                Your startup details.
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-black/45">
                Tell us about your product. We review every application within 24 hours.
              </p>

              {authed === false && (
                <div className="mt-6 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/60">
                  You'll need an account to apply.{" "}
                  <Link to="/auth" className="font-medium text-black underline underline-offset-2">Sign in or create one →</Link>
                </div>
              )}

              <form onSubmit={goToStep2} className="mt-10 space-y-7">
                <Field label="Startup name" hint="The name shown in the bar across the network.">
                  <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme AI" className={inputCls} />
                </Field>
                <Field label="Website URL" hint="Your homepage — where visitors land when they click.">
                  <input
                    required type="url" value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={() => {
                      const v = url.trim();
                      if (v && !v.startsWith("http://") && !v.startsWith("https://")) setUrl("https://" + v);
                    }}
                    placeholder="acme.ai" className={inputCls}
                  />
                </Field>
                <Field label="One-liner" hint="What your product does, in plain English. Max 100 chars.">
                  <textarea required maxLength={100} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Turn meeting notes into action items, automatically." className={inputCls + " resize-none"} />
                  <div className="mt-1 text-right text-[11px] text-black/30">{desc.length} / 100</div>
                </Field>
                <Field label="Founder note (optional)" hint="A short line about why you're building this. Shown on your public startup profile page, next to your name and photo.">
                  <textarea maxLength={280} rows={3} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="I built this after losing an hour every day to manual meeting notes." className={inputCls + " resize-none"} />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-black/30">
                    <span>You can add or edit this later from your dashboard.</span>
                    <span>{quote.length} / 280</span>
                  </div>
                </Field>
                <Field label="Bar placement" hint="Where the bar sits on your own site. You can change this anytime in your account.">
                  <div className="grid w-full grid-cols-3 gap-1 rounded-lg border border-black/12 bg-black/[0.02] p-1 sm:inline-flex sm:w-auto sm:gap-0">
                    {(["top", "bottom"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setPlacement(p); setMode("widget"); }}
                        aria-pressed={!isSupporter && placement === p}
                        className={`rounded-md px-2 py-2 text-sm font-medium capitalize transition sm:px-4 sm:py-1.5 ${!isSupporter && placement === p ? "bg-white text-black shadow-sm" : "text-black/45 hover:text-black/70"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMode("supporter")}
                      aria-pressed={isSupporter}
                      className={`whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium transition sm:px-4 sm:py-1.5 ${isSupporter ? "bg-white text-black shadow-sm" : "text-black/45 hover:text-black/70"}`}
                    >
                      No Bar
                    </button>
                  </div>
                  {isSupporter ? (
                    <SupporterStory />
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-black/40">
                      Top placement earns you more free impressions from the network. Our reciprocity algorithm rewards the most visible bars with more visibility in return. Bottom is still supported if it fits your layout.
                    </p>
                  )}
                </Field>
                <button type="submit" className="group flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3.5 text-sm font-medium text-white transition-all hover:bg-black/80">
                  {isSupporter ? "Next — Supporter setup" : "Next — Install the script"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="text-center text-xs text-black/30">
                  {isSupporter ? `${SUPPORTER_TRIAL_DAYS} days free, then $${SUPPORTER_PRICE_USD}/year · Cancel anytime` : "Free forever · We review within 24h · No commitment"}
                </p>
              </form>
            </div>

            <div className="hidden md:block">
              <div className="sticky top-10">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Live preview</span>
                <p className="mt-1.5 text-sm text-black/40">This is how your startup will appear on other founders' sites.</p>
                <div className="mt-5">
                  <BarPreview key={isSupporter ? "no-bar" : placement} name={name} url={url} desc={desc} placement={placement} noBar={isSupporter} />
                </div>
                <div className="mt-8 space-y-4 border-t border-black/8 pt-8">
                  {(isSupporter
                    ? [
                        "Your startup will appear across the network at an average member's share.",
                        "Nothing is shown on your website: No bar and no layout changes.",
                        "Your listing is highlighted in gold on the network page and the leaderboard.",
                        "The optional analytics code unlocks your visitor map and on-site stats. Your listing works without it.",
                      ]
                    : [
                        "Your bar will show on sites across the network as soon as you're approved.",
                        "In return, you'll show one other startup on your site — completely automatic.",
                        "Cancel anytime by removing the script tag. No lock-in, no fees.",
                      ]).map((t) => (
                    <div key={t} className="flex items-start gap-3">
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <p className="text-[13px] leading-relaxed text-black/45">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {step === 2 && (

        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-16">
          <button onClick={() => setStep(1)} className="mb-8 flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Step 2 of 2</span>
          <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            {isSupporter ? "Your analytics line (optional)." : "Install the script."}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-black/45">
            {isSupporter
               ? <>One invisible line. It shows nothing on your site it only unlocks your visitor map, visits and click stats. Skip it or add it later.</>
              : <>Paste this once inside the <code className="rounded bg-black/8 px-1.5 py-0.5 font-mono text-sm">&lt;head&gt;</code> of your site, then verify it's live.</>}
          </p>

          {isSupporter && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-black/50">
              <p>
                <strong className="font-medium text-black">If you skip it:</strong> your listing, rotation, profile, badge and network stats all work exactly the same. Only your visitor map and on-site stats stay locked.
              </p>
            </div>
          )}

          {/* Progress pills */}
          <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-black/50">
            {[
              { n: 1, label: "Paste", active: true },
              { n: 2, label: "Verify", active: verifyStatus !== "idle" },
              { n: 3, label: isSupporter ? "Pay & submit" : "Submit", active: isSupporter || verifyStatus === "live" || verifyStatus === "csp-img" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${s.active ? "bg-black text-white" : "bg-black/8 text-black/40"}`}>{s.n}</span>
                <span className={s.active ? "text-black" : ""}>{s.label}</span>
                {i < 2 && <span className="mx-1 h-px w-6 bg-black/10" />}
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.02] px-5 py-4">
            {url && <StartupFavicon url={url} name={name} size={20} className="rounded-sm" />}
            <div className="min-w-0">
              <p className="font-medium text-black">{name}</p>
              <p className="truncate text-xs text-black/40">{url}</p>
            </div>
            <button onClick={() => setStep(1)} className="ml-auto text-xs text-black/35 hover:text-black transition-colors">Edit</button>
          </div>

          {/* Install checklist card */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white">
            {/* Embed code */}
            <div className="border-b border-black/8 p-5 sm:p-6">
              <p className="text-sm font-semibold text-black">
                {isSupporter ? "1 · Your analytics code (optional)" : "1 · Your embed code"}
              </p>
              <p className="mt-1 text-xs text-black/45">This is your unique startup ID — it won't change after you apply.</p>
              <CopyableCode code={snippet} />
              <AgentPromptCard prompt={agentPrompt} />
            </div>

            {/* Verify */}
            <div className={`border-b border-black/8 p-5 sm:p-6 border-l-2 ${
              verifyStatus === "live" ? "border-l-emerald-500" :
              verifyStatus === "csp" ? "border-l-red-500" :
              verifyStatus === "csp-frame" ? "border-l-red-500" :
              verifyStatus === "csp-img" ? "border-l-amber-500" :
              verifyStatus === "not-found" ? "border-l-amber-500" :
              verifyStatus === "error" ? "border-l-black/20" :
              "border-l-transparent"
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black">
                    {isSupporter ? "2 · Verify installation (optional)" : "2 · Verify installation"}
                  </p>
                  <p className="mt-0.5 text-xs text-black/40 truncate">We'll check if the script is live on <span className="font-medium text-black/60">{url}</span></p>
                </div>
                <button
                  onClick={() => checkInstallation()}
                  disabled={verifyStatus === "checking"}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-black/[0.04] transition-all disabled:opacity-40"
                >
                  {verifyStatus === "checking" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</> : "Check now"}
                </button>
              </div>

              {verifyStatus === "live" && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{verifyMsg}</span>
                </div>
              )}

              {verifyStatus === "csp" && (
                <div className="mt-4 space-y-3 rounded-lg bg-red-50 px-4 py-3.5 text-sm text-red-800">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Blocked by your Content-Security-Policy</p>
                      <p className="mt-0.5 text-[13px] text-red-800/80">The script is on your page, but your CSP disallows loading from <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-[11px]">startupbar.co</code>. Add these directives (or merge them into your existing CSP), then re-check:</p>
                    </div>
                  </div>
                  <CopyableCode
                    tone="red"
                    label="CSP"
                    code={`script-src https://startupbar.co;\nframe-src  https://startupbar.co;`}
                  />
                </div>
              )}

              {verifyStatus === "csp-frame" && (
                <div className="mt-4 space-y-3 rounded-lg bg-red-50 px-4 py-3.5 text-sm text-red-800">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Your CSP is blocking the widget iframe</p>
                      <p className="mt-0.5 text-[13px] text-red-800/80">
                        Your script loads fine, but your Content-Security-Policy has no <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-[11px]">frame-src</code> directive — so the browser falls back to <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-[11px]">default-src 'self'</code> and blocks the StartupBar iframe. Your visitors currently see a <strong>broken frame icon</strong> where the bar should be. Merge these directives into your existing CSP, then re-check:
                      </p>
                    </div>
                  </div>
                  <CopyableCode
                    tone="red"
                    label="CSP"
                    code={`script-src 'self' https://startupbar.co;\nframe-src  https://startupbar.co;\nimg-src    'self' data: https://www.google.com https://*.googleusercontent.com;`}
                  />
                </div>
              )}

              {verifyStatus === "csp-img" && (
                <div className="mt-4 space-y-3 rounded-lg bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-medium">Widget is live — but favicons may not render</p>
                      <p className="mt-0.5 text-[13px] text-amber-900/80">
                        Your CSP's <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">img-src</code> blocks external images. The bar itself renders, but the featured startup's favicon will show as a broken image. You can submit as-is, or fix it by adding these hosts to <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">img-src</code>:
                      </p>
                    </div>
                  </div>
                  <CopyableCode
                    tone="red"
                    label="CSP"
                    code={`img-src 'self' data: https://www.google.com https://*.googleusercontent.com;`}
                  />
                </div>
              )}


              {verifyStatus === "not-found" && (
                <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">{verifyMsg}</p>
                      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[12.5px] text-amber-900/75">
                        <li>Make sure it's on the exact URL above (not a subpage).</li>
                        <li>If you deploy through a CDN, purge the cache or hard-reload.</li>
                        <li>SPAs: hit the homepage once so the script mounts.</li>
                        <li>Check the tag lives in <code className="font-mono">&lt;head&gt;</code> or top of <code className="font-mono">&lt;body&gt;</code>.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {verifyStatus === "error" && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-black/[0.03] px-4 py-3 text-sm text-black/60">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{verifyMsg}</span>
                </div>
              )}
            </div>

            {/* Install guide */}
            <div className="p-5 sm:p-6">
              <p className="text-sm font-semibold text-black">3 · Install guide & options</p>
              <p className="mt-1 text-xs text-black/45">Optional reading — expand what you need.</p>
              <div className="mt-4 space-y-2">
                <GuideItem title="Where to paste it">
                  <p><strong>Recommended:</strong> inside <code className="font-mono">&lt;head&gt;</code>. Works in <code className="font-mono">&lt;body&gt;</code> too.</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li><strong>Next.js</strong> — <code className="font-mono">app/layout.tsx</code> inside <code className="font-mono">&lt;head&gt;</code>, or <code className="font-mono">pages/_document.tsx</code>.</li>
                    <li><strong>Astro</strong> — your top-level <code className="font-mono">Layout.astro</code> inside <code className="font-mono">&lt;head&gt;</code>.</li>
                    <li><strong>WordPress</strong> — <code className="font-mono">header.php</code>, or a "header scripts" plugin.</li>
                    <li><strong>Webflow</strong> — Project Settings → Custom Code → Head Code.</li>
                    <li><strong>Framer</strong> — Site Settings → Custom Code → Head.</li>
                    <li><strong>Plain HTML</strong> — anywhere inside <code className="font-mono">&lt;head&gt;</code>.</li>
                  </ul>
                </GuideItem>

                <GuideItem title="Force light or dark theme">
                  <p>The bar auto-detects your site's theme (<code className="font-mono">prefers-color-scheme</code> + a <code className="font-mono">.dark</code> class on <code className="font-mono">&lt;html&gt;</code>). To force a theme, add <code className="font-mono">data-theme</code> to the script tag:</p>
                  <div className="mt-2">
                    <CopyableCode
                      code={`<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${startupId}" data-theme="dark"></script>`}
                    />
                  </div>
                  <p className="mt-2 text-black/50">Values: <code className="font-mono">"light"</code> or <code className="font-mono">"dark"</code>.</p>
                </GuideItem>

                {placement === "bottom" ? (
                  <GuideItem title="Keep the bar clear of floating elements">
                    <p>The widget is <strong>36px tall</strong> and pinned to the bottom of the page. The loader reserves that space for you, so no extra CSS is normally needed. If you have something else fixed to the bottom (cookie banner, chat bubble), lift it:</p>
                    <div className="mt-2">
                      <CopyableCode
                        code={`/* Lift a bottom-fixed element above the bar */\n.my-chat-bubble { bottom: 36px; }`}
                      />
                    </div>
                    <p className="mt-2 text-black/50">Your header needs no change with bottom placement.</p>
                  </GuideItem>
                ) : (
                  <GuideItem title="Keep your header from hiding behind the bar">
                    <p>The widget is <strong>36px tall</strong> and pinned to the top of the page. Our loader tries to shift <code className="font-mono">fixed</code>/<code className="font-mono">sticky</code> headers automatically, but if yours still sits underneath, add this CSS as a manual fallback:</p>
                    <div className="mt-2">
                      <CopyableCode
                        code={`/* Push a fixed/sticky header down */\nheader { top: 36px; }\n\n/* Or give the whole page breathing room */\nbody { padding-top: 36px; }`}
                      />
                    </div>
                    <p className="mt-2 text-black/50">On mobile, if the page appears to "jump" once on load, that's the auto-shift kicking in — setting the padding yourself removes the jump.</p>
                  </GuideItem>
                )}


                <GuideItem title="Troubleshooting">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li><strong>CSP blocks the script</strong> — add <code className="font-mono">script-src https://startupbar.co;</code> and <code className="font-mono">frame-src https://startupbar.co;</code>.</li>
                    <li><strong>SPA routing</strong> — the loader re-mounts on <code className="font-mono">pushState</code>, no extra work needed.</li>
                    <li><strong>Doesn't appear after deploy</strong> — hard-reload (Cmd/Ctrl + Shift + R) or purge your CDN cache.</li>
                    <li><strong>Remove the widget</strong> — just delete the <code className="font-mono">&lt;script&gt;</code> tag. No account changes needed.</li>
                    <li><strong>Still stuck?</strong> Email <a href="mailto:hello@startupbar.co" className="underline">hello@startupbar.co</a>.</li>
                  </ul>
                </GuideItem>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {(() => {
              const needsPayment = !resubmitId && existingCount >= 1 && !hasPrepaid;
              const verified = verifyStatus === "live" || verifyStatus === "csp-img";
              const busy = loading || paymentLoading || verifyingPayment;
              // Supporters pay instead of showing the bar, so verification is
              // never a gate for them — the snippet is optional.
              const disabled = isSupporter ? busy : (!verified || busy);
              const onClick = isSupporter
                ? handleSupporterPayment
                : needsPayment
                ? handlePayment
                : () => onSubmit();
              const label = verifyingPayment
                ? "Verifying payment…"
                : loading
                ? "Submitting…"
                : paymentLoading
                ? "Redirecting to payment…"
                : isSupporter
                ? `Start ${SUPPORTER_TRIAL_DAYS}-day free trial & submit →`
                : needsPayment
                ? "Pay $9.99 & submit →"
                : "Submit application";
              return (
                <button
                  onClick={onClick}
                  disabled={disabled}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3.5 text-sm font-medium text-white transition-all hover:bg-black/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              );
            })()}
            <p className="text-center text-xs text-black/30">
              {isSupporter
                ? `${SUPPORTER_TRIAL_DAYS} days free, then $${SUPPORTER_PRICE_USD}/year including tax. Card required. Cancel before the trial ends to avoid a charge. Analytics code is optional.`
                : verifyStatus !== "live" && verifyStatus !== "csp-img"
                ? "Install the script and verify it's live to continue."
                : !resubmitId && existingCount >= 1 && !hasPrepaid
                ? "Script verified ✓ — one-time $9.99 for additional listings."
                : "Script verified ✓ — you're all set."}
            </p>
          </div>
        </div>

      )}
      </main>
    </div>
  );
}

