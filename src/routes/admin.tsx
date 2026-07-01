import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ExternalLink, LogOut, Clock, RefreshCw, Radio, CircleSlash, Loader2, Eye, EyeOff, ShieldOff, Ban, Send, Users, Mail } from "lucide-react";

const ADMIN_EMAIL = "danielabinav16@gmail.com";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — StartupBar" },
      { name: "description", content: "Internal admin console for reviewing and approving startup applications on StartupBar." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/admin" }],
  }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || data.user.email !== ADMIN_EMAIL) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPage,
});

interface Startup {
  id: string;
  name: string;
  website_url: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_id: string;
  warned_at: string | null;
  warn_expires_at: string | null;
  widget_hidden_at: string | null;
  widget_last_heartbeat_at: string | null;
  widget_currently_visible: boolean | null;
  strike_count: number;
  rejection_reason: string | null;
  banned: boolean;
}

type EmbedState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "installed"; suspicious: boolean; cspBlocked: boolean }
  | { state: "missing" }
  | { state: "error" };


const STATUS_TABS = ["all", "pending", "approved", "warned", "rejected"] as const;
type Tab = typeof STATUS_TABS[number];

const STATUS_STYLES = {
  pending:  "bg-amber-50  text-amber-700  border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50    text-red-700    border-red-200",
} as const;

function formatRemaining(expiresAt: string, now: number): string {
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
}

function AdminPage() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [updating, setUpdating] = useState<string | null>(null);
  const [embed, setEmbed] = useState<Record<string, EmbedState>>({});
  const [now, setNow] = useState<number>(() => Date.now());
  const [rejectTarget, setRejectTarget] = useState<Startup | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("not_allowed_type");
  const [rejectNote, setRejectNote] = useState<string>("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  async function checkEmbed(id: string, website: string) {
    setEmbed((p) => ({ ...p, [id]: { state: "checking" } }));
    try {
      const r = await fetch(`/api/public/verify-install?url=${encodeURIComponent(website)}`);
      const j = await r.json();
      const next: EmbedState = j.installed
        ? { state: "installed", suspicious: !!j.suspicious, cspBlocked: !!j.cspBlocked }
        : j.error
          ? { state: "error" }
          : { state: "missing" };
      setEmbed((p) => ({ ...p, [id]: next }));
      if (next.state === "installed" && !next.suspicious && !next.cspBlocked) {
        const s = startups.find((x) => x.id === id);
        if (s?.warn_expires_at) {
          await supabase.from("startups").update({ warned_at: null, warn_expires_at: null }).eq("id", id);
          setStartups((prev) => prev.map((x) => x.id === id ? { ...x, warned_at: null, warn_expires_at: null } : x));
          toast.success("Reinstalled ✓ — warning cleared");
        }
      }
    } catch {
      setEmbed((p) => ({ ...p, [id]: { state: "error" } }));
    }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("startups")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data as Startup[]) ?? [];
    setStartups(list);
    setLoading(false);
    // Check embed for any startup with a website (including pending — that's the point)
    list.filter((s) => s.website_url && s.status !== "rejected").forEach((s) => checkEmbed(s.id, s.website_url));
  }


  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: "approved" | "rejected", reason?: string, note?: string) {
    setUpdating(id);
    const update: Partial<Startup> = { status };
    if (status === "rejected" && reason) update.rejection_reason = reason;
    const { error } = await supabase.from("startups").update(update).eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Startup ${status}`);
      setStartups((prev) => prev.map((s) => s.id === id ? { ...s, status, rejection_reason: reason ?? s.rejection_reason } : s));
      const emailType = status === "approved"
        ? "startup-approved"
        : "startup-rejected";
      const emailBody: Record<string, unknown> = { startupId: id };
      if (status === "rejected") {
        emailBody.reason = reason ?? "generic";
        if (note) emailBody.note = note;
      }
      supabase.functions.invoke("send-email", { body: { type: emailType, data: emailBody } }).catch(() => {});
    }
    setUpdating(null);
  }

  async function warnStartup(s: Startup) {
    if (!confirm(`Send 48h warning email to the founder of "${s.name}"?`)) return;
    setUpdating(s.id);
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const warned = new Date().toISOString();
    const { error } = await supabase.from("startups").update({ warned_at: warned, warn_expires_at: expires }).eq("id", s.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Warning sent — 48h countdown started");
      setStartups((prev) => prev.map((x) => x.id === s.id ? { ...x, warned_at: warned, warn_expires_at: expires } : x));
      supabase.functions.invoke("send-email", { body: { type: "startup-warning", data: { startupId: s.id } } }).catch(() => {});
    }
    setUpdating(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const isWarned = (s: Startup) => s.status === "approved" && !!s.warn_expires_at;
  const filtered =
    tab === "all" ? startups :
    tab === "warned" ? startups.filter(isWarned) :
    startups.filter((s) => s.status === tab);
  const counts: Record<Tab, number> = {
    all: startups.length,
    pending: startups.filter((s) => s.status === "pending").length,
    approved: startups.filter((s) => s.status === "approved").length,
    warned: startups.filter(isWarned).length,
    rejected: startups.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-2 w-6 rounded-sm bg-black" />
              <span className="text-sm font-semibold tracking-tight text-black">StartupBar</span>
            </Link>
            <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={load} className="flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-md border border-black/12 px-2 py-1.5 text-sm text-black/60 hover:text-black transition-all sm:px-3">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <BroadcastPanel />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Applications
            </h1>
            <p className="mt-0.5 text-sm text-black/40">Review and manage startup applications.</p>
          </div>
          <div className="flex items-center gap-2">
            {counts.pending > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                <Clock className="h-3 w-3" />
                {counts.pending} pending
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-black/8">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-3 py-2.5 text-sm font-medium capitalize transition-colors sm:px-4 ${
                tab === t ? "text-black" : "text-black/40 hover:text-black/70"
              }`}
            >
              {t}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                tab === t ? "bg-black text-white" : "bg-black/8 text-black/40"
              }`}>
                {counts[t]}
              </span>
              {tab === t && <span className="absolute inset-x-0 -bottom-px h-px bg-black" />}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-sm text-black/30">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-sm text-black/40">No {tab === "all" ? "" : tab} applications yet.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-black/8 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-black/6 bg-black/[0.02]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">Startup</th>
                    <th className="hidden px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 md:table-cell">One-liner</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">Embed</th>
                    <th className="hidden px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 lg:table-cell">Widget Health</th>
                    <th className="hidden px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:table-cell">Applied</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((s) => {
                    const e: EmbedState = embed[s.id] ?? { state: "idle" };
                    const scriptInstalled = e.state === "installed";
                    const scriptSuspicious = e.state === "installed" && e.suspicious;
                    const scriptCspBlocked = e.state === "installed" && e.cspBlocked;
                    const hbFresh = !!s.widget_last_heartbeat_at && (now - new Date(s.widget_last_heartbeat_at).getTime()) < 24 * 60 * 60_000;
                    const hbVisible = hbFresh && s.widget_currently_visible === true;
                    const hbHidden = hbFresh && s.widget_currently_visible === false;
                    // CSP block takes priority: even a stale "visible" heartbeat is
                    // misleading if the browser now refuses to load loader.js.
                    const badge: "checking" | "live" | "hidden" | "csp-blocked" | "installed-unseen" | "missing" | "error" | "idle" =
                      e.state === "checking" ? "checking"
                      : scriptCspBlocked ? "csp-blocked"
                      : hbVisible && !scriptSuspicious ? "live"
                      : hbHidden || scriptSuspicious ? "hidden"
                      : scriptInstalled ? "installed-unseen"
                      : e.state === "error" ? "error"
                      : e.state === "missing" ? "missing"
                      : "idle";
                    return (
                    <tr key={s.id} className="hover:bg-black/[0.01] transition-colors">
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black">{s.name}</span>
                          <a href={s.website_url?.startsWith("http") ? s.website_url : `https://${s.website_url}`} target="_blank" rel="noopener noreferrer"
                            className="text-black/25 hover:text-black transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="mt-0.5 max-w-[160px] truncate text-xs text-black/35 sm:max-w-none">{s.website_url}</div>
                      </td>
                      <td className="hidden max-w-xs px-5 py-4 md:table-cell">
                        <p className="line-clamp-2 text-sm text-black/60">{s.description}</p>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[s.status]}`}>
                            {s.status}
                          </span>
                          {s.warn_expires_at && s.status === "approved" && (() => {
                            const expired = new Date(s.warn_expires_at).getTime() <= now;
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                expired
                                  ? "border-red-300 bg-red-100 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}>
                                <Clock className="h-2.5 w-2.5" />
                                {expired ? "Warning expired" : `Warned · ${formatRemaining(s.warn_expires_at, now)}`}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <button
                          onClick={() => checkEmbed(s.id, s.website_url)}
                          disabled={!s.website_url || badge === "checking"}
                          title={
                            badge === "live" ? "Script installed and widget visible to visitors"
                            : badge === "hidden" ? (scriptSuspicious
                                ? "Script is wrapped in a hidden element (display:none / visibility:hidden / height:0)"
                                : "Script installed but widget reports as hidden on the page")
                            : badge === "installed-unseen" ? "Script tag detected, but no recent visibility ping. The page may not have been loaded yet."
                            : badge === "missing" ? "Loader script not found in page HTML"
                            : badge === "error" ? "Could not reach the site"
                            : "Click to re-check"
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                            badge === "live"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : badge === "hidden"
                              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                              : badge === "installed-unseen"
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : badge === "missing"
                              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              : badge === "error"
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-black/10 bg-black/[0.02] text-black/45 hover:bg-black/[0.04]"
                          }`}
                        >
                          {badge === "checking" ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Checking</>
                          ) : badge === "live" ? (
                            <><Radio className="h-3 w-3" /> Live</>
                          ) : badge === "hidden" ? (
                            <><EyeOff className="h-3 w-3" /> {scriptSuspicious ? "Hidden (CSS)" : "Hidden"}</>
                          ) : badge === "installed-unseen" ? (
                            <><Eye className="h-3 w-3" /> Installed · not seen</>
                          ) : badge === "missing" ? (
                            <><CircleSlash className="h-3 w-3" /> Not installed</>
                          ) : badge === "error" ? (
                            <><CircleSlash className="h-3 w-3" /> Unreachable</>
                          ) : (
                            <><RefreshCw className="h-3 w-3" /> Check</>
                          )}
                        </button>
                      </td>

                      <td className="hidden px-5 py-4 lg:table-cell">
                        {s.banned ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            <Ban className="h-3 w-3" /> Banned
                          </span>
                        ) : s.rejection_reason === "widget_hidden" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                            <ShieldOff className="h-3 w-3" /> Suspended
                          </span>
                        ) : s.widget_hidden_at ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              <EyeOff className="h-3 w-3" /> Hidden · Strike {s.strike_count}
                            </span>
                            <span className="text-[10px] text-black/35">
                              since {new Date(s.widget_hidden_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} {new Date(s.widget_hidden_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        ) : s.widget_last_heartbeat_at ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <Eye className="h-3 w-3" /> Visible
                            </span>
                            <span className="text-[10px] text-black/35">
                              last seen {new Date(s.widget_last_heartbeat_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-black/25">No heartbeat yet</span>
                        )}
                      </td>
                      <td className="hidden px-5 py-4 text-xs text-black/35 sm:table-cell">
                        {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === "approved" && (badge === "missing" || badge === "error") && !s.warn_expires_at && (
                            <button onClick={() => warnStartup(s)} disabled={updating === s.id}
                              title="Email founder a 48-hour reinstall warning"
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 sm:gap-1.5 sm:px-3">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Warn 48h</span>
                            </button>
                          )}
                          {s.status !== "approved" && (
                            <button onClick={() => setStatus(s.id, "approved")} disabled={updating === s.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 sm:gap-1.5 sm:px-3">
                              <Check className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                          )}
                          {s.status !== "rejected" && (() => {
                            const warnExpired = !!s.warn_expires_at && new Date(s.warn_expires_at).getTime() <= now;
                            const isWidgetRemoval = warnExpired || (!!s.warn_expires_at && s.status === "approved");
                            const openModal = () => {
                              const defaultReason = isWidgetRemoval
                                ? "widget_not_installed"
                                : badge === "hidden"
                                  ? "widget_hidden"
                                  : badge === "missing"
                                    ? "widget_not_installed"
                                    : badge === "error"
                                      ? "broken_site"
                                      : "not_allowed_type";
                              setRejectReason(defaultReason);
                              setRejectNote("");
                              setRejectTarget(s);
                            };
                            return (
                              <button onClick={openModal} disabled={updating === s.id}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 sm:gap-1.5 sm:px-3 ${
                                  warnExpired
                                    ? "border-red-400 bg-red-100 text-red-700 hover:bg-red-200 ring-1 ring-red-300"
                                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                }`}>
                                <X className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Reject</span>
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {rejectTarget && (() => {
        const REASONS: { value: string; label: string; hint: string }[] = [
          { value: "not_allowed_type", label: "Site type not allowed", hint: "Directory, affiliate, adult, gambling, scraper, link farm, etc." },
          { value: "widget_hidden", label: "Widget bar is hidden", hint: "Script is installed but bar is hidden via CSS or wrapped in a 0-height element." },
          { value: "widget_not_installed", label: "Widget not installed", hint: "Embed script is missing from the site's <head>." },
          { value: "low_quality", label: "Site not ready / low quality", hint: "Placeholder content, broken pages, coming-soon, no real product." },
          { value: "duplicate", label: "Duplicate submission", hint: "We already have this startup or domain on file." },
          { value: "broken_site", label: "Site unreachable", hint: "Site returned an error, timed out, or wouldn't load." },
          { value: "generic", label: "Other (generic rejection)", hint: "Use the note field below to add context." },
        ];
        const target = rejectTarget;
        const close = () => setRejectTarget(null);
        const submit = async () => {
          close();
          await setStatus(target.id, "rejected", rejectReason, rejectNote.trim() || undefined);
        };
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-3 py-4" onClick={close}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-black/8 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Reject application</div>
                  <div className="text-base font-semibold text-black mt-0.5">{target.name}</div>
                </div>
                <button onClick={close} className="text-black/40 hover:text-black p-1"><X className="h-4 w-4" /></button>
              </div>
              <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                <p className="text-xs text-black/50 mb-3">Pick a reason — the founder gets a branded email matching it.</p>
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label key={r.value} className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${rejectReason === r.value ? "border-black bg-black/[0.03]" : "border-black/10 hover:bg-black/[0.02]"}`}>
                      <input type="radio" name="reject-reason" value={r.value} checked={rejectReason === r.value} onChange={() => setRejectReason(r.value)} className="mt-0.5 accent-black" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-black">{r.label}</div>
                        <div className="text-xs text-black/50 mt-0.5">{r.hint}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Optional note to founder</label>
                  <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Add specifics they should know (appended to the email)…"
                    className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none resize-none" />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-black/8 bg-black/[0.02] flex items-center justify-end gap-2">
                <button onClick={close} className="px-3 py-1.5 text-sm text-black/60 hover:text-black rounded-lg">Cancel</button>
                <button onClick={submit} disabled={updating === target.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 text-sm font-medium disabled:opacity-50">
                  <X className="h-3.5 w-3.5" /> Reject &amp; send email
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const SEGMENTS: { value: string; label: string; hint: string }[] = [
  { value: "all", label: "All users", hint: "Every signed-up user" },
  { value: "no_startup", label: "Signed up · no startup yet", hint: "Users who never submitted a startup" },
  { value: "has_startup", label: "Any startup submitted", hint: "Users with at least one startup (any status)" },
  { value: "approved_only", label: "Approved founders", hint: "Users with ≥1 approved startup" },
  { value: "pending_only", label: "Pending only", hint: "Have pending startup, none approved" },
  { value: "rejected_only", label: "Only rejected", hint: "All their startups are rejected" },
];

function BroadcastPanel() {
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState("no_startup");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [lastErrors, setLastErrors] = useState<{ email: string; error: string }[]>([]);

  async function refreshCount(seg: string) {
    setLoadingCount(true);
    setCount(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "admin-broadcast-recipients", data: { segment: seg } },
      });
      if (error) throw error;
      setCount((data as { count: number })?.count ?? 0);
    } catch (e) {
      toast.error("Couldn't load recipient count");
    } finally {
      setLoadingCount(false);
    }
  }

  useEffect(() => { if (open) refreshCount(segment); }, [segment, open]);

  async function refreshPreview() {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body required"); return; }
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { type: "admin-broadcast-preview", data: { subject, headline, bodyMarkdown: body } },
    });
    if (error) { toast.error("Preview failed"); return; }
    setPreviewHtml((data as { html: string }).html);
  }

  async function send(testOnly: boolean) {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body required"); return; }
    if (!testOnly) {
      const n = count ?? 0;
      if (n === 0) { toast.error("No recipients in this segment"); return; }
      if (!confirm(`Send to ${n} recipient${n === 1 ? "" : "s"}? Each gets their own email with you in BCC.`)) return;
    }
    setSending(true);
    const toastId = toast.loading(testOnly ? "Sending test…" : `Sending to ${count} recipients…`);
    setLastErrors([]);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "admin-broadcast", data: { segment, subject, headline, bodyMarkdown: body, testOnly } },
      });
      if (error) throw error;
      const r = data as { sent: number; failed: number; total: number; errors: { email: string; error: string }[] };
      toast.success(`Sent ${r.sent}/${r.total}${r.failed ? ` · ${r.failed} failed` : ""}`, { id: toastId });
      if (r.failed && r.errors?.length) {
        setLastErrors(r.errors);
        console.warn("Broadcast errors:", r.errors);
      }
    } catch (e) {
      toast.error(`Send failed: ${String(e).slice(0, 200)}`, { id: toastId });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-black/8 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm">
          <Mail className="h-4 w-4 text-black/50" />
          <span className="font-medium text-black">Broadcast email</span>
          <span className="text-black/40">— write a custom message to a user segment</span>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80">
          <Send className="h-3.5 w-3.5" /> Compose
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-black/8 bg-white">
      <div className="flex items-center justify-between border-b border-black/8 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-black">
          <Mail className="h-4 w-4" /> Broadcast email
        </div>
        <button onClick={() => setOpen(false)} className="text-black/40 hover:text-black"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Recipients</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none">
              {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-black/50">
              <Users className="h-3 w-3" />
              {loadingCount ? "Counting…" : count === null ? "—" : `${count} recipient${count === 1 ? "" : "s"}`}
              <span className="text-black/30">· {SEGMENTS.find((s) => s.value === segment)?.hint}</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="e.g. Your StartupBar spot is waiting"
              className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none" />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Headline (optional)</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={140} placeholder="Defaults to subject"
              className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none" />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
              placeholder={"Hi {{name}},\n\nQuick note — you signed up but haven't listed a startup yet.\n\n- Free listing\n- 60-sec install\n- Live in the network within 24h\n\nGet started: [startupbar.co/apply](https://startupbar.co/apply)"}
              className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 font-mono text-[13px] text-black placeholder:text-black/30 focus:border-black focus:outline-none resize-y" />
            <div className="mt-1.5 text-[11px] text-black/40">
              Supports <code className="text-black/60">**bold**</code>, <code className="text-black/60">[link](https://…)</code>, <code className="text-black/60">- bullets</code>, blank line for paragraphs. Use <code className="text-black/60">{"{{name}}"}</code> for first name.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button onClick={refreshPreview} disabled={sending} className="inline-flex items-center gap-1.5 rounded-lg border border-black/12 px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-50">
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button onClick={() => send(true)} disabled={sending} className="inline-flex items-center gap-1.5 rounded-lg border border-black/12 px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-50">
              <Mail className="h-3.5 w-3.5" /> Send test to me
            </button>
            <button onClick={() => send(false)} disabled={sending || !count} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-xs font-medium text-white hover:bg-black/80 disabled:opacity-50">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send to {count ?? "…"} recipient{count === 1 ? "" : "s"}
            </button>
          </div>

          {lastErrors.length > 0 && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="mb-1.5 text-xs font-semibold text-red-800">
                {lastErrors.length} send{lastErrors.length === 1 ? "" : "s"} failed
              </div>
              <ul className="max-h-40 space-y-1 overflow-auto text-[11px] text-red-900/80 font-mono">
                {lastErrors.map((e, i) => (
                  <li key={i}><span className="font-semibold">{e.email}</span> — {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Preview</label>
          <div className="mt-1.5 h-[520px] overflow-hidden rounded-lg border border-black/10 bg-[#f5f5f4]">
            {previewHtml ? (
              <iframe title="Email preview" srcDoc={previewHtml} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-black/40 px-6">
                Fill out subject + body then click Preview to see the rendered email.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
