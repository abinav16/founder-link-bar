import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Save, User, Globe, Trash2, Plus, ChevronDown, ChevronUp, ExternalLink, Info, Upload, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — StartupBar" },
      { name: "description", content: "Manage your StartupBar profile, startups, and account settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

interface Startup {
  id: string;
  name: string;
  website_url: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  logo_url: string | null;
  user_id: string;
}

const inputCls = "w-full rounded-lg border border-black/12 bg-white px-3.5 py-2.5 text-sm text-black placeholder:text-black/25 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/8 disabled:bg-black/[0.03] disabled:text-black/40";

const STATUS_STYLES = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
} as const;

function LogoPreview({ logoUrl, websiteUrl, size = 40 }: { logoUrl: string | null; websiteUrl: string; size?: number }) {
  const domain = (() => { try { return new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, ""); } catch { return websiteUrl; } })();
  const src = logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  return (
    <div
      className="rounded-xl border border-black/8 bg-black/[0.03] shrink-0"
      style={{
        width: size, height: size,
        background: `rgba(0,0,0,0.03) url(${src}) center/cover no-repeat`,
        backgroundSize: logoUrl ? "cover" : "62%",
        borderRadius: 10,
      }}
    />
  );
}

function StartupCard({ startup, onUpdate, onDelete }: {
  startup: Startup;
  onUpdate: (id: string, data: Partial<Startup>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sName, setSName] = useState(startup.name);
  const [sDesc, setSDesc] = useState(startup.description);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(startup.logo_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges = sName.trim() !== startup.name || sDesc.trim() !== startup.description;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("startups").update({
      name: sName.trim(),
      description: sDesc.trim(),
      status: "pending",
    }).eq("id", startup.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Changes submitted for review");
    onUpdate(startup.id, { name: sName.trim(), description: sDesc.trim(), status: "pending" });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }

    setUploading(true);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      toast.error("Please sign in again to upload your logo");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${userData.user.id}/${startup.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("startup-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) { toast.error(uploadErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("startup-logos").getPublicUrl(path);
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    const { error: dbErr } = await supabase.from("startups").update({ logo_url: publicUrl }).eq("id", startup.id);
    if (dbErr) { toast.error(dbErr.message); setUploading(false); return; }

    setLogoUrl(urlWithBust);
    onUpdate(startup.id, { logo_url: publicUrl });
    toast.success("Logo updated");
    setUploading(false);
    e.target.value = "";
  }

  async function removeLogo() {
    const { error } = await supabase.from("startups").update({ logo_url: null }).eq("id", startup.id);
    if (error) { toast.error(error.message); return; }
    setLogoUrl(null);
    onUpdate(startup.id, { logo_url: null });
    toast.success("Logo removed");
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("startups").delete().eq("id", startup.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Startup deleted");
    window.dispatchEvent(new CustomEvent("startup-deleted"));
    onDelete(startup.id);
  }

  return (
    <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <LogoPreview logoUrl={logoUrl} websiteUrl={startup.website_url} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-black truncate">{startup.name}</p>
            <span className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[startup.status]}`}>
              {startup.status}
            </span>
          </div>
          <p className="text-xs text-black/40 truncate">{startup.website_url}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={startup.website_url?.startsWith("http") ? startup.website_url : `https://${startup.website_url}`} target="_blank" rel="noopener noreferrer"
            className="text-black/25 hover:text-black transition-colors p-1">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button onClick={() => setExpanded(!expanded)}
            className="rounded-md p-1.5 text-black/30 hover:text-black hover:bg-black/5 transition-all">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-black/6 px-5 py-5">
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-black/60">Startup logo</label>
              <div className="flex items-center gap-4">
                <LogoPreview logoUrl={logoUrl} websiteUrl={startup.website_url} size={56} />
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/12 px-3 py-1.5 text-xs font-medium text-black/60 hover:border-black/25 hover:text-black transition-all disabled:opacity-40"
                  >
                    <Upload className="h-3 w-3" />
                    {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-200 hover:text-red-500 transition-all"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  )}
                  <p className="text-[10px] text-black/30">PNG, JPG, WebP or SVG · max 2 MB</p>
                </div>
              </div>
            </div>

            {hasChanges && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Changing your startup name or one-liner will send it back for review before it goes live again.</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-black/60">Startup name</label>
              <input required maxLength={60} value={sName} onChange={(e) => setSName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-black/60">
                Website URL
                <span className="ml-2 text-[10px] font-normal text-black/30">Cannot be changed</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/20" />
                <input value={startup.website_url} disabled className={inputCls + " pl-10 cursor-not-allowed"} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-black/60">One-liner ({sDesc.length}/100)</label>
              <textarea required maxLength={100} rows={2} value={sDesc} onChange={(e) => setSDesc(e.target.value)} className={inputCls + " resize-none"} />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all disabled:opacity-50">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Submitting…" : hasChanges ? "Submit for review" : "Saved"}
              </button>

              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black/40">Sure?</span>
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 transition-all disabled:opacity-50">
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-black/12 px-3 py-2 text-sm text-black/50 hover:text-black transition-all">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AccountPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      setName(u.user.user_metadata?.full_name ?? "");

      const { data } = await supabase
        .from("startups").select("id, name, website_url, description, status, logo_url, user_id").eq("user_id", u.user.id).order("created_at", { ascending: true });
      if (data) setStartups(data as Startup[]);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  }

  function handleUpdate(id: string, data: Partial<Startup>) {
    setStartups((prev) => prev.map((s) => s.id === id ? { ...s, ...data } : s));
  }

  function handleDelete(id: string) {
    setStartups((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <DashboardLayout>
      <div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Account</h1>
          <p className="mt-0.5 text-sm text-black/40">Manage your profile and startups.</p>
        </div>

        <div className="mt-8 space-y-10">
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div>
              <h2 className="text-sm font-semibold text-black">Profile</h2>
              <p className="mt-1 text-xs leading-relaxed text-black/40">Your name and email. Email cannot be changed.</p>
            </div>
            <div className="rounded-xl border border-black/8 bg-white p-6">
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/6">
                    <User className="h-5 w-5 text-black/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{name || "—"}</p>
                    <p className="text-xs text-black/40 truncate">{email}</p>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-black/60">Display name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-black/60">Email</label>
                  <input value={email} disabled className={inputCls} />
                </div>
                <button type="submit" disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" />
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </form>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div>
              <h2 className="text-sm font-semibold text-black">Your startups</h2>
              <p className="mt-1 text-xs leading-relaxed text-black/40">Each startup has its own embed script and appears independently in the network.</p>
            </div>
            <div className="space-y-3">
              {startups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/15 bg-white px-6 py-10 text-center">
                  <p className="text-sm text-black/40">No startups yet.</p>
                  <Link to="/apply"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all">
                    <Plus className="h-3.5 w-3.5" /> Apply your first startup
                  </Link>
                </div>
              ) : (
                <>
                  {startups.map((s) => (
                    <StartupCard key={s.id} startup={s} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                  <Link to="/apply"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-white py-3.5 text-sm font-medium text-black/50 hover:border-black/30 hover:text-black transition-all">
                    <Plus className="h-4 w-4" /> Add another startup
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
