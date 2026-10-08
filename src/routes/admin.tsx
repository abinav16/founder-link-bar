import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin-auth.functions";
import { toast } from "sonner";
import { Check, X, ExternalLink, LogOut, Clock, RefreshCw, Radio, CircleSlash, Loader2, Eye, EyeOff, ShieldOff, Ban, Send, Users, Mail } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Admin — StartupBar" },
      { name: "description", content: "Internal admin console for reviewing and approving startup applications on StartupBar." },
      { property: "og:title", content: "Admin — StartupBar" },
      { property: "og:description", content: "Internal admin console for reviewing and approving startup applications." },
      { property: "og:url", content: "https://startupbar.co/admin" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/admin" }],
  }),
  ssr: false,
  beforeLoad: async () => {
    // Fast path: no session at all -> bounce before paying for a round trip.
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });

    // Authoritative check happens on the server against the verified bearer
    // token, so a devtools breakpoint on this client code can't fake it.
    let ok = false;
    try {
      ok = await checkIsAdmin();
    } catch {
      ok = false;
    }
    if (!ok) throw redirect({ to: "/" });
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
  widget_last_page_url: string | null;
  strike_count: number;
  rejection_reason: string | null;
  banned: boolean;
  pending_name?: string | null;
  pending_description?: string | null;
  edit_status?: string;
  edit_submitted_at?: string | null;
}

/** Founder identity for the admin table. Email comes from an admin-only,
 *  email-gated database function — it is never exposed on any public path. */
interface FounderInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

function FounderCell({ founder, compact = false }: { founder?: FounderInfo; compact?: boolean }) {
  if (!founder) return <span className="text-xs text-black/25">—</span>;
  const name = founder.full_name?.trim() || "Unnamed founder";
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      {founder.avatar_url ? (
        <img
          src={founder.avatar_url}
          alt=""
          referrerPolicy="no-referrer"
          className={`${compact ? "h-5 w-5" : "h-7 w-7"} shrink-0 rounded-full object-cover ring-1 ring-black/10`}
        />
      ) : (
        <span className={`${compact ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[11px]"} flex shrink-0 items-center justify-center rounded-full bg-black/5 font-semibold text-black/40`}>
          {initial}
        </span>
      )}
      <div className="min-w-0">
        <div className={`truncate font-medium text-black/80 ${compact ? "text-xs" : "text-sm"}`}>{name}</div>
        {founder.email && (
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(founder.email!); toast.success("Email copied"); }}
            title="Copy email"
            className="max-w-[180px] truncate text-[11px] text-black/40 underline decoration-black/15 underline-offset-2 transition-colors hover:text-black"
          >
            {founder.email}
          </button>
        )}
      </div>
    </div>
  );
}



type EmbedState =
  | { state: "idle" }
  | { state: "checking" }
  | {
      state: "installed";
      suspicious: boolean;
      cspBlocked: boolean;
      idMismatch: boolean;
      installedId: string | null;
      consentBlocked: boolean;
      consentVendor: string | null;
      conditionalInstall: boolean;
    }

  | { state: "missing" }
  | { state: "error" };


const STATUS_TABS = ["all", "pending", "edits", "approved", "warned", "rejected"] as const;
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
  const [founders, setFounders] = useState<Record<string, FounderInfo>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  async function checkEmbed(id: string, website: string) {
    setEmbed((p) => ({ ...p, [id]: { state: "checking" } }));
    try {
      const { data: sess } = await supabase.auth.getSession();
      let token = sess.session?.access_token;
      if (!token) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) token = (await supabase.auth.getSession()).data.session?.access_token;
      }
      const r = await fetch(`/api/public/verify-install?url=${encodeURIComponent(website)}&id=${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const j = await r.json();
      const next: EmbedState = j.installed
        ? {
            state: "installed",
            suspicious: !!j.suspicious,
            cspBlocked: !!j.cspBlocked,
            idMismatch: !!j.idMismatch,
            installedId: j.installedId ?? null,
            consentBlocked: !!j.consentBlocked,
            consentVendor: j.consentVendor ?? null,
            conditionalInstall: !!j.conditionalInstall,
          }
        : j.error
          ? { state: "error" }
          : { state: "missing" };
      setEmbed((p) => ({ ...p, [id]: next }));
      if (
        next.state === "installed" &&
        !next.suspicious &&
        !next.cspBlocked &&
        !next.idMismatch &&
        !next.consentBlocked &&
        !next.conditionalInstall
      ) {

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
    // Full rows come from an admin-only, email-gated database function.
    // Ordinary roles can no longer read moderation/widget-health columns.
    const { data } = await supabase.rpc("admin_all_startups" as never);

    const list = (data as unknown as Startup[] | null) ?? [];
    setStartups(list);
    setLoading(false);
    // Founder identity (incl. email) also comes from an admin-only gated
    // function; a non-admin caller gets "Forbidden" and no rows.
    const ownerIds = Array.from(new Set(list.map((s) => s.user_id).filter(Boolean)));
    if (ownerIds.length) {
      const { data: f } = await supabase.rpc("admin_founder_info" as never, { _user_ids: ownerIds } as never);
      const rows = (f as unknown as FounderInfo[] | null) ?? [];
      setFounders(Object.fromEntries(rows.map((r) => [r.user_id, r])));
    }
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

  /** Approve or reject a pending name/one-liner edit on an already-live listing. */
  async function resolveEdit(s: Startup, accept: boolean) {
    setUpdating(s.id);
    const patch = accept
      ? {
          name: (s.pending_name ?? s.name).trim(),
          description: (s.pending_description ?? s.description).trim(),
          pending_name: null,
          pending_description: null,
          edit_status: "none",
          edit_submitted_at: null,
        }
      : { pending_name: null, pending_description: null, edit_status: "none", edit_submitted_at: null };
    const { error } = await supabase.from("startups").update(patch as never).eq("id", s.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(accept ? "Changes applied" : "Changes rejected");
      setStartups((prev) => prev.map((x) => x.id === s.id ? { ...x, ...(patch as Partial<Startup>) } : x));
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
  const hasEdit = (s: Startup) => s.edit_status === "pending";
  const filtered =
    tab === "all" ? startups :
    tab === "warned" ? startups.filter(isWarned) :
    tab === "edits" ? startups.filter(hasEdit) :
    startups.filter((s) => s.status === tab);
  const counts: Record<Tab, number> = {
    all: startups.length,
    pending: startups.filter((s) => s.status === "pending").length,
    edits: startups.filter(hasEdit).length,
    approved: startups.filter((s) => s.status === "approved").length,
    warned: startups.filter(isWarned).length,
    rejected: startups.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="min-h-dvh bg-[#f7f7f6]">
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

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <BroadcastPanel />
        <UnsubReasonsPanel />
       <OrphanPaymentsPanel />
       <RemovedApplicationsPanel />




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

        <div className="scrollbar-none -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-black/8 px-4 sm:mx-0 sm:px-0">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium capitalize transition-colors sm:px-4 ${
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
                    <th className="hidden px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 md:table-cell">Founder</th>
                    <th className="hidden px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 lg:table-cell">One-liner</th>
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
                    const scriptIdMismatch = e.state === "installed" && e.idMismatch;
                    const installedIdValue = e.state === "installed" ? e.installedId : null;
                    const scriptConsentBlocked = e.state === "installed" && e.consentBlocked;
                    const consentVendorName = e.state === "installed" ? e.consentVendor : null;
                    const scriptConditional = e.state === "installed" && e.conditionalInstall;

                    // Heartbeat freshness: a ping in the last 6h is "recent
                    // enough to trust as currently live" — but only when the
                    // page scan ALSO still finds the script (a founder can
                    // remove the snippet minutes after a valid ping).
                    // A tighter 30-min window drives the "Stale" label so the
                    // health column can show a recent-visit signal separately.
                    const hbAgeMs = s.widget_last_heartbeat_at ? now - new Date(s.widget_last_heartbeat_at).getTime() : null;
                    const hbFresh = hbAgeMs !== null && hbAgeMs < 6 * 60 * 60_000;
                    const hbStale = hbAgeMs !== null && hbAgeMs >= 30 * 60_000;
                    const hbVisible = hbFresh && s.widget_currently_visible === true;
                    const hbHidden = hbFresh && s.widget_currently_visible === false;
                    // Script pinged us at some point but is gone from the HTML
                    // now → the founder took it down after installing.
                    const scriptRemoved = e.state === "missing" && !!s.widget_last_heartbeat_at;
                    const hbSeenAt = s.widget_last_heartbeat_at
                      ? new Date(s.widget_last_heartbeat_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : null;
                    // Wrong-ID takes top priority: the loader is pinging a
                    // different startup, so our heartbeats will never match
                    // this row no matter what the site looks like.
                    const badge: "checking" | "live" | "hidden" | "csp-blocked" | "wrong-id" | "consent-blocked" | "conditional" | "installed-unseen" | "removed" | "missing" | "error" | "idle" =
                      e.state === "checking" ? "checking"
                      : scriptIdMismatch ? "wrong-id"
                      : scriptCspBlocked ? "csp-blocked"
                      : scriptConsentBlocked ? "consent-blocked"
                      : scriptRemoved ? "removed"
                      : scriptInstalled && hbVisible && !scriptSuspicious && !scriptConditional ? "live"
                      : scriptInstalled && (hbHidden || scriptSuspicious) ? "hidden"
                      : scriptConditional ? "conditional"
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
                        {/* Mobile: founder shown inline since the column is hidden below md */}
                        <div className="mt-1 md:hidden">
                          <FounderCell founder={founders[s.user_id]} compact />
                        </div>
                        {/* Mobile: one-liner and proposed edit shown inline since that column is hidden below lg */}
                        <div className="lg:hidden">
                          {s.description && <p className="mt-2 line-clamp-2 max-w-[240px] text-xs text-black/55">{s.description}</p>}
                          {s.edit_status === "pending" && (
                            <div className="mt-2 w-[240px] max-w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Proposed edit</p>
                              {(s.pending_name ?? s.name) !== s.name && (
                                <p className="mt-1 break-words text-xs text-black/70">
                                  <span className="text-black/35 line-through">{s.name}</span>{" → "}
                                  <span className="font-medium">{s.pending_name}</span>
                                </p>
                              )}
                              {(s.pending_description ?? s.description) !== s.description && (
                                <p className="mt-1 break-words text-xs text-black/70">{s.pending_description}</p>
                              )}
                              <div className="mt-2 grid grid-cols-2 gap-1.5">
                                <button onClick={() => resolveEdit(s, true)} disabled={updating === s.id}
                                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-medium text-emerald-700 disabled:opacity-50">
                                  Approve
                                </button>
                                <button onClick={() => resolveEdit(s, false)} disabled={updating === s.id}
                                  className="rounded-md border border-black/12 bg-white px-2 py-2 text-xs font-medium text-black/60 disabled:opacity-50">
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">
                        <FounderCell founder={founders[s.user_id]} />
                      </td>
                      <td className="hidden max-w-xs px-5 py-4 lg:table-cell">
                        <p className="line-clamp-2 text-sm text-black/60">{s.description}</p>
                        {s.edit_status === "pending" && (
                          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Proposed edit</p>
                            {(s.pending_name ?? s.name) !== s.name && (
                              <p className="mt-1 text-xs text-black/70">
                                <span className="text-black/35 line-through">{s.name}</span>{" → "}
                                <span className="font-medium">{s.pending_name}</span>
                              </p>
                            )}
                            {(s.pending_description ?? s.description) !== s.description && (
                              <p className="mt-1 text-xs text-black/70">{s.pending_description}</p>
                            )}
                            <div className="mt-2 flex gap-1.5">
                              <button onClick={() => resolveEdit(s, true)} disabled={updating === s.id}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                                Approve changes
                              </button>
                              <button onClick={() => resolveEdit(s, false)} disabled={updating === s.id}
                                className="rounded-md border border-black/12 bg-white px-2 py-1 text-[11px] font-medium text-black/60 hover:text-black transition-colors disabled:opacity-50">
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
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
                            : badge === "csp-blocked" ? "Site's Content Security Policy blocks startupbar.co/widget/loader.js. Ask the founder to add https://startupbar.co to their script-src directive."
                            : badge === "wrong-id" ? `Loader is installed with a different data-startup-id${installedIdValue ? ` (${installedIdValue})` : ""}. Heartbeats will never match this startup — ask the founder to re-copy their snippet.`
                            : badge === "consent-blocked" ? `${consentVendorName ?? "A cookie-consent"} auto-blocker on this site stops third-party scripts, so the widget never loads until a visitor accepts cookies. Ask the founder to allowlist startupbar.co in their consent tool.`
                            : badge === "conditional" ? "Loader is injected by inline JS and/or hidden by a conditional CSS rule, so it only runs on some pages. Ask the founder to install it site-wide."
                            : badge === "hidden" ? (scriptSuspicious

                                ? "Script is wrapped in a hidden element (display:none / visibility:hidden / height:0)"
                                : "Script installed but widget reports as hidden on the page")
                            : badge === "installed-unseen" ? "Script tag detected, but no recent visibility ping. The page may not have been loaded yet."
                            : badge === "removed" ? `Script was installed and last pinged${hbSeenAt ? ` at ${hbSeenAt}` : ""}, but is no longer present in the page HTML — the founder removed it.`
                            : badge === "missing" ? "Loader script not found in page HTML"
                            : badge === "error" ? "Could not reach the site"
                            : "Click to re-check"
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                            badge === "live"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : badge === "csp-blocked"
                              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                              : badge === "wrong-id"
                              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                              : badge === "consent-blocked"
                              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : badge === "conditional"
                              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : badge === "hidden"
                              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                              : badge === "installed-unseen"

                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : badge === "removed"
                              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
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
                          ) : badge === "csp-blocked" ? (
                            <><ShieldOff className="h-3 w-3" /> CSP blocked</>
                          ) : badge === "wrong-id" ? (
                            <><CircleSlash className="h-3 w-3" /> Wrong ID</>
                          ) : badge === "consent-blocked" ? (
                            <><ShieldOff className="h-3 w-3" /> Consent blocked{consentVendorName ? ` · ${consentVendorName}` : ""}</>
                          ) : badge === "conditional" ? (
                            <><Eye className="h-3 w-3" /> Partial install</>
                          ) : badge === "hidden" ? (
                            <><EyeOff className="h-3 w-3" /> {scriptSuspicious ? "Hidden (CSS)" : "Hidden"}</>

                          ) : badge === "installed-unseen" ? (
                            <><Eye className="h-3 w-3" /> Installed · not seen</>
                          ) : badge === "removed" ? (
                            <><EyeOff className="h-3 w-3" /> Removed</>
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
                            {hbStale ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-0.5 text-xs font-medium text-black/50">
                                <Clock className="h-3 w-3" /> Stale
                              </span>
                            ) : s.widget_currently_visible === false ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                <EyeOff className="h-3 w-3" /> Hidden
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                <Eye className="h-3 w-3" /> Visible
                              </span>
                            )}
                            <span className="text-[10px] text-black/35">
                              last seen {new Date(s.widget_last_heartbeat_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {s.widget_last_page_url && (
                              <a
                                href={s.widget_last_page_url}
                                target="_blank"
                                rel="noreferrer"
                                title={s.widget_last_page_url}
                                className="max-w-[180px] truncate text-[10px] text-black/40 hover:text-black/70 hover:underline"
                              >
                                on {(() => { try { const u = new URL(s.widget_last_page_url); return u.pathname === "/" ? u.host : u.pathname; } catch { return s.widget_last_page_url; } })()}
                              </a>
                            )}
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
                                : badge === "csp-blocked"
                                  ? "csp_blocked"
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
      </main>


      {rejectTarget && (() => {
        const REASONS: { value: string; label: string; hint: string }[] = [
          { value: "not_allowed_type", label: "Site type not allowed", hint: "Directory, affiliate, adult, gambling, scraper, link farm, etc." },
          { value: "widget_hidden", label: "Widget bar is hidden", hint: "Script is installed but bar is hidden via CSS or wrapped in a 0-height element." },
          { value: "csp_blocked", label: "CSP blocks our widget script", hint: "script-src refuses to load startupbar.co/widget/loader.js." },
          { value: "csp_frame_blocked", label: "CSP blocks the widget iframe", hint: "Script loads, but frame-src / default-src blocks the startupbar.co iframe — visitor sees a broken frame icon." },
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
                    className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black placeholder:text-black/45 focus:border-black focus:outline-none resize-none" />
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
  { value: "step2_no_startup", label: "Reached step 2 · never installed", hint: "Got to the install-script step in apply but never submitted" },
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
  const [total, setTotal] = useState<number | null>(null);
  const [batches, setBatches] = useState<number>(1);
  const [batchSize, setBatchSize] = useState<number>(80);
  const [batchIndex, setBatchIndex] = useState<number>(1);
  const [unsubscribed, setUnsubscribed] = useState<number>(0);
  const [optedOut, setOptedOut] = useState<number>(0);
  const [bounced, setBounced] = useState<number>(0);
  const [complained, setComplained] = useState<number>(0);
  const [ineligible, setIneligible] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [lastErrors, setLastErrors] = useState<{ email: string; error: string }[]>([]);

  async function refreshCount(seg: string, size: number, index: number) {
    setLoadingCount(true);
    setCount(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "admin-broadcast-recipients", data: { segment: seg, batchSize: size, batchIndex: index } },
      });
      if (error) throw error;
      const r = data as { count: number; total?: number; batches?: number; unsubscribed?: number; optedOut?: number; bounced?: number; complained?: number; ineligible?: number };
      setCount(r?.count ?? 0);
      setTotal(r?.total ?? r?.count ?? 0);
      setBatches(Math.max(1, r?.batches ?? 1));
      setUnsubscribed(r?.unsubscribed ?? 0);
      setOptedOut(r?.optedOut ?? 0);
      setBounced(r?.bounced ?? 0);
      setComplained(r?.complained ?? 0);
      setIneligible(r?.ineligible ?? 0);
    } catch (e) {
      toast.error("Couldn't load recipient count");
    } finally {
      setLoadingCount(false);
    }
  }

  useEffect(() => { if (open) refreshCount(segment, batchSize, batchIndex); }, [segment, open, batchSize, batchIndex]);
  // Changing segment or batch size restarts at batch 1.
  useEffect(() => { setBatchIndex(1); }, [segment, batchSize]);

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
      if (n === 0) { toast.error("No recipients in this batch"); return; }
      const label = batchSize ? ` (batch ${batchIndex} of ${batches})` : "";
      if (!confirm(`Send to ${n} recipient${n === 1 ? "" : "s"}${label}? Each gets their own email with you in BCC.`)) return;
    }
    setSending(true);
    const toastId = toast.loading(testOnly ? "Sending test…" : `Sending to ${count} recipients…`);
    setLastErrors([]);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "admin-broadcast", data: { segment, subject, headline, bodyMarkdown: body, testOnly, batchSize, batchIndex } },
      });
      if (error) throw error;
      const r = data as { sent: number; failed: number; total: number; queued?: boolean; errors: { email: string; error: string }[] };
      if (r.queued) {
        toast.success(`Queued ${r.total} emails — sending in the background (~${Math.ceil((r.total * 0.55) / 60)} min)`, { id: toastId });
      } else {
        toast.success(`Sent ${r.sent}/${r.total}${r.failed ? ` · ${r.failed} failed` : ""}`, { id: toastId });
      }
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
              {unsubscribed > 0 && (
                <span className="text-black/40">· {unsubscribed} suppressed</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-black/35">
              <span>{optedOut} opted out</span>
              <span>· {bounced} bounced</span>
              <span>· {complained} spam reports</span>
              <span>· {ineligible} unverified or closed accounts skipped</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Daily batch</label>
            <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-2">
              <select value={batchIndex} onChange={(e) => setBatchIndex(Number(e.target.value))}
                disabled={!batchSize}
                className="w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none disabled:opacity-50">
                {Array.from({ length: batches }, (_, i) => i + 1).map((n) => {
                  const start = (n - 1) * batchSize + 1;
                  const end = Math.min(n * batchSize, total ?? n * batchSize);
                  return <option key={n} value={n}>{`Batch ${n} of ${batches} · ${start}–${end}`}</option>;
                })}
              </select>
              <select value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}
                className="rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none">
                {[50, 80, 100, 150].map((n) => <option key={n} value={n}>{n} / day</option>)}
                <option value={0}>No limit</option>
              </select>
            </div>
            <div className="mt-1.5 text-[11px] text-black/40">
              {total === null
                ? "—"
                : batchSize
                  ? `${total} in this segment · sending batch ${batchIndex} today, pick the next batch tomorrow.`
                  : `${total} in this segment · sending everyone at once.`}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="e.g. Your StartupBar spot is waiting"
              className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black placeholder:text-black/45 focus:border-black focus:outline-none" />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Headline (optional)</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={140} placeholder="Defaults to subject"
              className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-black placeholder:text-black/45 focus:border-black focus:outline-none" />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">Body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
              placeholder={"Hi {{name}},\n\nQuick note — you signed up but haven't listed a startup yet.\n\n- Free listing\n- 60-sec install\n- Live in the network within 24h\n\nGet started: [startupbar.co/apply](https://startupbar.co/apply)"}
              className="mt-1.5 w-full rounded-lg border border-black/12 bg-white px-3 py-2 font-mono text-[13px] text-black placeholder:text-black/45 focus:border-black focus:outline-none resize-y" />
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

const REASON_LABELS: Record<string, string> = {
  too_many_emails: "Too many emails",
  not_relevant: "Not relevant",
  no_longer_interested: "No longer interested",
  content_quality: "Content quality",
  never_signed_up: "Never signed up",
  other: "Other",
  unspecified: "Not specified",
};

function UnsubReasonsPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    total: number;
    counts: Record<string, number>;
    recent: Array<{ email: string; reason: string; details: string | null; at: string }>;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("send-email", {
        body: { type: "admin-unsub-reasons" },
      });
      if (error) throw error;
      setData(res as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !data) void load();
  }, [open]);

  const sortedCounts = data
    ? Object.entries(data.counts).sort((a, b) => b[1] - a[1])
    : [];
  const max = sortedCounts[0]?.[1] ?? 1;

  return (
    <section className="mb-8 rounded-2xl border border-black/8 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-black">Unsubscribe analytics</h2>
          <p className="text-xs text-black/50">
            {data ? `${data.total} total unsubscribes` : "Reason breakdown from user opt-outs"}
          </p>
        </div>
        <span className="text-xs text-black/40">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-black/8 px-5 py-4 space-y-5">
          {loading && <div className="text-xs text-black/50">Loading…</div>}
          {data && data.total === 0 && (
            <div className="text-xs text-black/50">No unsubscribes yet.</div>
          )}
          {data && data.total > 0 && (
            <>
              <div className="space-y-1.5">
                {sortedCounts.map(([code, count]) => (
                  <div key={code} className="flex items-center gap-3 text-xs">
                    <div className="w-40 shrink-0 text-black/70">{REASON_LABELS[code] ?? code}</div>
                    <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden">
                      <div
                        className="h-full bg-black"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <div className="w-10 text-right tabular-nums text-black/60">{count}</div>
                  </div>
                ))}
              </div>
              {data.recent.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.15em] text-black/40 font-semibold">
                    Recent
                  </div>
                  <div className="divide-y divide-black/5 rounded-lg border border-black/8">
                    {data.recent.map((r, i) => (
                      <div key={i} className="px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-black truncate">{r.email}</span>
                          <span className="text-black/40 shrink-0">
                            {new Date(r.at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-0.5 text-black/60">
                          {REASON_LABELS[r.reason] ?? r.reason}
                          {r.details ? ` — ${r.details}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

type RemovedEvent = {
  id: string;
  startup_name: string;
  website_url: string | null;
  applicant_email: string | null;
  created_at: string;
  metadata: { description?: string; last_status?: string } | null;
};

function RemovedApplicationsPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RemovedEvent[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("application_events")
      .select("id, startup_name, website_url, applicant_email, created_at, metadata")
      .eq("event_type", "deleted")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as RemovedEvent[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (open) load(); }, [open]);

  function outreachMailto(r: RemovedEvent) {
    const subject = encodeURIComponent(`Everything okay with your StartupBar application?`);
    const body = encodeURIComponent(
      `Hey,\n\nI got your ${r.startup_name} application come through recently — thanks for putting it in! I went to review it just now and noticed the listing isn't in our system anymore, which usually means it was removed from the account page.\n\nTotally no worries if that was on purpose. I just wanted to check in — did something feel off, or was there a step that wasn't clear? If you'd like, I'm happy to jump in and get you set up personally: walk you through the widget snippet, help place it on ${r.website_url ?? "your site"}, and get you approved on the network the same day.\n\nJust reply here and I'll take it from there.\n\nCheers,\nDaniel — StartupBar`
    );
    const to = r.applicant_email ?? "";
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }

  return (
    <section className="mb-6 rounded-2xl border border-black/8 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div className="flex items-center gap-2">
          <CircleSlash className="h-4 w-4 text-black/50" />
          <span className="text-sm font-semibold tracking-tight text-black">Recently removed</span>
          <span className="rounded-full bg-black/8 px-2 py-0.5 text-[10px] font-semibold text-black/60">30d</span>
        </div>
        <span className="text-xs text-black/40">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-black/8 px-4 py-3 sm:px-5">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-black/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-xs text-black/40">No applications removed in the last 30 days.</p>
          ) : (
            <ul className="divide-y divide-black/8">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-black">{r.startup_name}</span>
                      {r.metadata?.last_status && (
                        <span className="rounded-full border border-black/10 bg-black/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-black/50">
                          was {r.metadata.last_status}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-black/50">
                      {r.website_url && (
                        <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-black">
                          {r.website_url.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {r.applicant_email && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(r.applicant_email!); toast.success("Email copied"); }}
                          className="hover:text-black"
                          title="Copy email"
                        >
                          {r.applicant_email}
                        </button>
                      )}
                      <span>Removed {new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <a
                    href={outreachMailto(r)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-black/12 bg-white px-2.5 py-1.5 text-xs font-medium text-black hover:bg-black hover:text-white transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" /> Reach out
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}


type OrphanPayment = {
  id: string;
  user_id: string;
  dodo_payment_id: string;
  created_at: string;
  email: string | null;
};

function OrphanPaymentsPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<OrphanPayment[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_orphan_payments", { _older_than_minutes: 10 });
    if (!error && data) setRows(data as OrphanPayment[]);
    setLoading(false);
  }

  // Load on mount so the count badge is visible without expanding the panel.
  useEffect(() => { load(); }, []);


  function mailto(r: OrphanPayment): string {
    const subject = encodeURIComponent(`Your StartupBar payment — let me help finish setup`);
    const body = encodeURIComponent(
      `Hey,\n\nI saw a successful payment on your account (${r.dodo_payment_id}) but your listing didn't finish submitting on our end — sorry about that.\n\nCan you reply with the site URL, name, and a one-liner description? I'll add it manually and email you the widget snippet the moment it's live.\n\nCheers,\nDaniel — StartupBar`,
    );
    return `mailto:${r.email ?? ""}?subject=${subject}&body=${body}`;
  }

  return (
    <section className="mb-6 rounded-2xl border border-red-200 bg-red-50/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-red-600" />
          <span className="text-sm font-semibold tracking-tight text-black">Paid but not submitted</span>
          {rows.length > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">{rows.length}</span>
          )}
        </div>
        <span className="text-xs text-black/40">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-red-200 px-4 py-3 sm:px-5">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-black/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-xs text-black/50">No orphaned payments right now. 🎉</p>
          ) : (
            <ul className="divide-y divide-red-200">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-black">{r.email ?? "(unknown email)"}</span>
                      <span className="rounded-full border border-black/10 bg-white px-1.5 py-0.5 text-[10px] font-mono text-black/50">
                        {r.dodo_payment_id}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-black/50">
                      Paid {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <a
                    href={mailto(r)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-black/12 bg-white px-2.5 py-1.5 text-xs font-medium text-black hover:bg-black hover:text-white transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" /> Reach out
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

