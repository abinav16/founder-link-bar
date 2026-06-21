import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ExternalLink, LogOut, Clock, RefreshCw } from "lucide-react";

const ADMIN_EMAIL = "danielabinav16@gmail.com";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — StartupBar" }] }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || data.user.email !== ADMIN_EMAIL) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

interface Startup { id: string; name: string; website_url: string; description: string; status: "pending" | "approved" | "rejected"; created_at: string; user_id: string; }
const STATUS_TABS = ["all", "pending", "approved", "rejected"] as const;
type Tab = typeof STATUS_TABS[number];
const STATUS_STYLES = { pending: "bg-amber-50 text-amber-700 border-amber-200", approved: "bg-emerald-50 text-emerald-700 border-emerald-200", rejected: "bg-red-50 text-red-700 border-red-200" } as const;

function AdminPage() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() { setLoading(true); const { data } = await supabase.from("startups").select("*").order("created_at", { ascending: false }); setStartups((data as Startup[]) ?? []); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: "approved" | "rejected") {
    setUpdating(id);
    const { error } = await supabase.from("startups").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); } else {
      supabase.functions.invoke("send-email", { body: { type: status === "approved" ? "startup-approved" : "startup-rejected", data: { startupId: id } } }).catch(() => {});
      toast.success(`Startup ${status}`); setStartups((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    }
    setUpdating(null);
  }

  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/" }); }

  const filtered = tab === "all" ? startups : startups.filter((s) => s.status === tab);
  const counts = { all: startups.length, pending: startups.filter((s) => s.status === "pending").length, approved: startups.filter((s) => s.status === "approved").length, rejected: startups.filter((s) => s.status === "rejected").length };

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4"><Link to="/" className="flex items-center gap-2"><div className="h-2 w-6 rounded-sm bg-black" /><span className="text-sm font-semibold tracking-tight text-black">StartupBar</span></Link><span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Admin</span></div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-md border border-black/12 px-3 py-1.5 text-sm text-black/60 hover:text-black transition-all"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Applications</h1><p className="mt-0.5 text-sm text-black/40">Review and manage startup applications.</p></div>
          <div className="flex items-center gap-2">{counts.pending > 0 && (<span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"><Clock className="h-3 w-3" />{counts.pending} pending</span>)}</div>
        </div>
        <div className="mt-6 flex gap-1 border-b border-black/8">
          {STATUS_TABS.map((t) => (<button key={t} onClick={() => setTab(t)} className={`relative px-4 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t ? "text-black" : "text-black/40 hover:text-black/70"}`}>{t}<span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tab === t ? "bg-black text-white" : "bg-black/8 text-black/40"}`}>{counts[t]}</span>{tab === t && <span className="absolute inset-x-0 -bottom-px h-px bg-black" />}</button>))}
        </div>
        {loading ? (<div className="flex items-center justify-center py-32 text-sm text-black/30">Loading…</div>) : filtered.length === 0 ? (<div className="flex flex-col items-center justify-center py-32 text-center"><p className="text-sm text-black/40">No {tab === "all" ? "" : tab} applications yet.</p></div>) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-black/8 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-black/6 bg-black/[0.02]"><th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">Startup</th><th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">One-liner</th><th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">Status</th><th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">Applied</th><th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">Actions</th></tr></thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-black/[0.01] transition-colors">
                    <td className="px-5 py-4"><div className="flex items-center gap-2"><span className="font-medium text-black">{s.name}</span><a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-black/25 hover:text-black transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a></div><div className="mt-0.5 text-xs text-black/35">{s.website_url}</div></td>
                    <td className="max-w-xs px-5 py-4"><p className="line-clamp-2 text-sm text-black/60">{s.description}</p></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[s.status]}`}>{s.status}</span></td>
                    <td className="px-5 py-4 text-xs text-black/35">{new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-4"><div className="flex items-center justify-end gap-2">{s.status !== "approved" && (<button onClick={() => setStatus(s.id, "approved")} disabled={updating === s.id} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"><Check className="h-3.5 w-3.5" />Approve</button>)}{s.status !== "rejected" && (<button onClick={() => setStatus(s.id, "rejected")} disabled={updating === s.id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"><X className="h-3.5 w-3.5" />Reject</button>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
