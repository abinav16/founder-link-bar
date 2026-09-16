import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Save, User, Globe, Trash2, Plus, ChevronDown, ChevronUp, ExternalLink, Info, Upload, X, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { PromoteButton } from "@/components/FeaturedBookingDialog";

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
  slug: string | null;
  founder_name: string | null;
  founder_quote: string | null;
  founder_avatar_url: string | null;
  widget_placement: "top" | "bottom" | null;
  membership_mode?: string | null;
  supporter_until?: string | null;
  supporter_cancel_at_period_end?: boolean | null;
  tracking_last_seen_at?: string | null;
  pending_name?: string | null;
  pending_description?: string | null;
  edit_status?: string | null;
  edit_submitted_at?: string | null;
}


const inputCls = "w-full rounded-lg border border-black/12 bg-white px-3.5 py-2.5 text-sm text-black placeholder:text-black/45 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/8 disabled:bg-black/[0.03] disabled:text-black/40";

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
  const editPending = startup.edit_status === "pending";
  const isSupporterMode = startup.membership_mode === "supporter";
  const [expanded, setExpanded] = useState(false);
  const [sName, setSName] = useState(startup.pending_name ?? startup.name);
  const [sDesc, setSDesc] = useState(startup.pending_description ?? startup.description);
  const [fQuote, setFQuote] = useState(startup.founder_quote ?? "");
  const [placement, setPlacement] = useState<"top" | "bottom">(startup.widget_placement === "bottom" ? "bottom" : "top");
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [placementInfo, setPlacementInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingFounder, setSavingFounder] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(startup.logo_url);
  const [reviewOpen, setReviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseName = startup.pending_name ?? startup.name;
  const baseDesc = startup.pending_description ?? startup.description;
  const hasChanges = sName.trim() !== baseName || sDesc.trim() !== baseDesc;
  const founderChanged = fQuote.trim() !== (startup.founder_quote ?? "");
  // An already-approved listing stays live while an edit waits for review.
  const keepsLive = startup.status === "approved";

  function onSubmitClick(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges || saving) return;
    setReviewOpen(true);
  }

  async function confirmSubmit() {
    setSaving(true);
    const patch = keepsLive
      ? {
          pending_name: sName.trim(),
          pending_description: sDesc.trim(),
          edit_status: "pending",
          edit_submitted_at: new Date().toISOString(),
        }
      : { name: sName.trim(), description: sDesc.trim(), status: "pending" as const };
    const { error } = await supabase.from("startups").update(patch as never).eq("id", startup.id);
    setSaving(false);
    setReviewOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sent for review", {
      description: keepsLive
        ? "Your listing stays live with its current text until we approve the change."
        : "We usually review within 24 hours.",
    });
    onUpdate(startup.id, patch as Partial<Startup>);
  }

  async function withdrawEdit() {
    setSaving(true);
    const { error } = await supabase.from("startups").update({
      pending_name: null,
      pending_description: null,
      edit_status: "none",
      edit_submitted_at: null,
    } as never).eq("id", startup.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSName(startup.name);
    setSDesc(startup.description);
    toast.success("Changes withdrawn");
    onUpdate(startup.id, { pending_name: null, pending_description: null, edit_status: "none", edit_submitted_at: null });
  }

  async function saveFounder() {
    setSavingFounder(true);
    const patch = { founder_quote: fQuote.trim() || null };
    const { error } = await supabase.from("startups").update(patch as any).eq("id", startup.id);
    setSavingFounder(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Founder profile updated");
    onUpdate(startup.id, patch as any);
  }

  async function savePlacement(next: "top" | "bottom") {
    if (next === placement || savingPlacement) return;
    const prev = placement;
    setPlacement(next);
    setSavingPlacement(true);
    const { error } = await supabase.from("startups").update({ widget_placement: next } as any).eq("id", startup.id);
    setSavingPlacement(false);
    if (error) { setPlacement(prev); toast.error(error.message); return; }
    toast.success(next === "top" ? "Bar will show at the top" : "Bar will show at the bottom", {
      description: "Live on your site within a page refresh.",
    });
    onUpdate(startup.id, { widget_placement: next } as any);
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
    <div className={`group rounded-2xl border bg-white transition-all ${expanded ? "border-black/15 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]" : "border-black/8 hover:border-black/15 hover:shadow-[0_4px_20px_-14px_rgba(0,0,0,0.3)]"}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
      >
        <LogoPreview logoUrl={logoUrl} websiteUrl={startup.website_url} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium tracking-tight text-black truncate">{startup.name}</p>
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[startup.status]}`}>
              <span className="h-1 w-1 rounded-full bg-current opacity-70" />
              {startup.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-black/40 truncate">{startup.website_url}</p>
        </div>
        {startup.status === "approved" && (
          <span className="hidden shrink-0 sm:inline-flex">
            <PromoteButton startupId={startup.id} as="span" showCancel />
          </span>
        )}
        <span
          role="link"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            const href = startup.website_url?.startsWith("http") ? startup.website_url : `https://${startup.website_url}`;
            window.open(href, "_blank", "noopener,noreferrer");
          }}
          className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-full text-black/25 hover:bg-black/5 hover:text-black transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-black/35 group-hover:bg-black/5 group-hover:text-black transition-all">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>




      {expanded && (
        <div className="border-t border-black/6 px-5 py-5">
          {startup.status === "approved" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:hidden">
              <PromoteButton startupId={startup.id} showCancel />
            </div>
          )}
          <form onSubmit={onSubmitClick} className="space-y-4">
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

            {editPending && (
              <div className="flex flex-wrap items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  Changes under review. Your listing stays live with its current name and one-liner until we approve them.
                </span>
                <button type="button" onClick={withdrawEdit} disabled={saving}
                  className="rounded-md border border-blue-300 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50">
                  Withdraw
                </button>
              </div>
            )}

            {hasChanges && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {keepsLive
                    ? "Name and one-liner changes go to us for review. Your listing stays live and unchanged in the meantime."
                    : "Changing your startup name or one-liner will send it back for review before it goes live again."}
                </span>
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

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="submit" disabled={saving || !hasChanges}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Submitting…" : hasChanges ? "Submit for review" : "Saved"}
              </button>

              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
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

          <MembershipSection startup={startup} onUpdate={onUpdate} />

          {!isSupporterMode && (
          <div className="mt-6 border-t border-black/6 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-sm font-medium text-black">Bar placement</p>
                <button
                  type="button"
                  aria-label="About bar placement"
                  onClick={() => setPlacementInfo((v) => !v)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-black/30 hover:bg-black/5 hover:text-black transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="inline-flex rounded-lg border border-black/12 bg-black/[0.03] p-0.5">
                {(["top", "bottom"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={savingPlacement}
                    onClick={() => savePlacement(p)}
                    className={`rounded-[6px] px-3.5 py-1.5 text-xs font-medium capitalize transition-all disabled:opacity-60 ${
                      placement === p ? "bg-white text-black shadow-sm" : "text-black/45 hover:text-black"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-black/40">
              Where the StartupBar sits on your site. Default is top. No review needed, it applies right away.
            </p>
            {placementInfo && (
              <div className="mt-3 space-y-2 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-[11px] leading-relaxed text-black/55">
                <p>Top usually performs better. Visitors expect a thin strip at the top, so it gets more attention and clicks than a bottom bar, which competes with cookie banners, chat bubbles and mobile toolbars.</p>
                <p>It also affects the traffic you receive. Delivery is reciprocity weighted: the more impressions your site sends into the network over the last 7 days, the more often your startup is shown on other members' sites, up to 4x the baseline. Placement doesn't change your weight directly, but a bottom bar that visitors scroll past tends to be seen and clicked less, so your contribution score and your incoming traffic both drift down.</p>
                <p>Bottom is fully supported if it suits your design. You can switch back any time.</p>
              </div>
            )}
          </div>
          )}


          <div className="mt-6 border-t border-black/6 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Founder quote</p>
                <p className="text-[11px] text-black/40">Your account name and avatar are used automatically. Update them in Profile above.</p>
              </div>
              {startup.status === "approved" && startup.slug && (
                <a href={`/startup/${startup.slug}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-black/50 hover:text-black">
                  View page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-black/60">Founder quote ({fQuote.length}/240)</label>
                <textarea maxLength={240} rows={2} value={fQuote} onChange={(e) => setFQuote(e.target.value)}
                  placeholder="Why you built it, in one sentence."
                  className={inputCls + " resize-none"} />
              </div>
              <button type="button" onClick={saveFounder} disabled={savingFounder || !founderChanged}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all disabled:opacity-40">
                <Save className="h-3.5 w-3.5" />
                {savingFounder ? "Saving…" : founderChanged ? "Save quote" : "Saved"}
              </button>
            </div>
          </div>

        </div>
      )}

      <Dialog open={reviewOpen} onOpenChange={(o) => !saving && setReviewOpen(o)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <LogoPreview logoUrl={logoUrl} websiteUrl={startup.website_url} size={44} />
              <div className="min-w-0 flex-1 text-left">
                <DialogTitle className="text-base font-semibold text-black truncate">{sName.trim() || startup.name}</DialogTitle>
                <p className="text-xs text-black/40 truncate">{startup.website_url}</p>
              </div>
            </div>
            <DialogDescription className="pt-3 text-left text-sm leading-relaxed text-black/60">
              {keepsLive ? (
                <>Your changes will be sent to the StartupBar team for review. <span className="font-medium text-black/80">{startup.name}</span> stays live on the network with its current text until they're approved.</>
              ) : (
                <>Your changes will be sent to the StartupBar team for review. During this time <span className="font-medium text-black/80">{sName.trim() || startup.name}</span> will be temporarily removed from the network and won't appear in the widget or leaderboard.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{keepsLive ? "Reviews usually take under 24 hours. Nothing changes on your live listing until then." : "Reviews usually take under 24 hours. You'll be back live as soon as it's approved."}</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={() => setReviewOpen(false)} disabled={saving}
              className="rounded-lg border border-black/12 px-4 py-2 text-sm font-medium text-black/60 hover:text-black hover:border-black/25 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={confirmSubmit} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all disabled:opacity-60">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Submitting…" : "Submit for review"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TABS = [
  { key: "profile" as const, label: "Profile", desc: "Name, photo, handle", icon: User },
  { key: "startups" as const, label: "Your startups", desc: "Listings & bar settings", icon: Globe },
];

function AccountPage() {
  const [tab, setTab] = useState<"profile" | "startups">("profile");
  const [email, setEmail] = useState("");

  const [name, setName] = useState("");
  const [twitter, setTwitter] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      setEmail(u.user.email ?? "");

      // Profile fields live in public.profiles (auth metadata gets overwritten
      // by Google on every sign-in), falling back to metadata when unset.
      const { data: prof } = await supabase.rpc("get_my_profile");
      const p = Array.isArray(prof) ? prof[0] : null;
      setName(p?.full_name ?? u.user.user_metadata?.full_name ?? "");
      setTwitter(p?.twitter_handle ?? u.user.user_metadata?.twitter_handle ?? "");
      setAvatarUrl(p?.avatar_url ?? u.user.user_metadata?.avatar_url ?? u.user.user_metadata?.picture ?? null);

      const { data } = await supabase
        .from("startups").select("id, name, website_url, description, status, logo_url, user_id, slug, founder_name, founder_quote, founder_avatar_url, widget_placement, pending_name, pending_description, edit_status, edit_submitted_at, membership_mode, supporter_until, supporter_cancel_at_period_end, tracking_last_seen_at").eq("user_id", u.user.id).order("created_at", { ascending: true });
      if (data) setStartups(data as Startup[]);
    })();
  }, []);

  function normalizeTwitter(input: string): string {
    return input.trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "").trim();
  }

  async function persistProfile(fields: { full_name?: string | null; avatar_url?: string | null; twitter_handle?: string | null }) {
    if (!userId) return "Please sign in again";
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...fields }, { onConflict: "id" });
    if (error) return error.message;
    // Keep auth metadata roughly in sync for greetings/emails (best effort).
    await supabase.auth.updateUser({ data: fields }).catch(() => {});
    return null;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const handle = normalizeTwitter(twitter);
    const err = await persistProfile({ full_name: name, twitter_handle: handle || null });
    setSavingProfile(false);
    if (err) toast.error(err);
    else { setTwitter(handle); toast.success("Profile updated"); }
  }


  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!userId) { toast.error("Please sign in again"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    setPendingAvatarFile(file);
  }

  async function uploadCroppedAvatar(blob: Blob) {
    setPendingAvatarFile(null);
    if (!userId) return;
    setUploadingAvatar(true);
    const path = `${userId}/avatar.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadErr) { toast.error(uploadErr.message); setUploadingAvatar(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const bustedUrl = `${publicUrl}?v=${Date.now()}`;

    const err = await persistProfile({ avatar_url: bustedUrl });
    if (err) { toast.error(err); setUploadingAvatar(false); return; }

    setAvatarUrl(bustedUrl);
    toast.success("Profile picture updated");
    setUploadingAvatar(false);
  }

  async function removeAvatar() {
    const err = await persistProfile({ avatar_url: null });
    if (err) { toast.error(err); return; }
    setAvatarUrl(null);
    toast.success("Profile picture removed");
  }

  function handleUpdate(id: string, data: Partial<Startup>) {
    setStartups((prev) => prev.map((s) => s.id === id ? { ...s, ...data } : s));
  }

  function handleDelete(id: string) {
    setStartups((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <>
    <DashboardLayout>
      <div className="pb-4">
        {/* Page header */}
        <header className="rounded-2xl border border-black/8 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-black/5 ring-1 ring-black/10 sm:h-16 sm:w-16">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><User className="h-6 w-6 text-black/25" /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/35">Account</p>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-[28px]" style={{ fontFamily: "var(--font-display)" }}>
                  {name || "Your account"}
                </h1>
                <p className="truncate text-xs text-black/40 sm:text-sm">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="min-w-[84px] rounded-xl border border-black/8 bg-black/[0.02] px-3.5 py-2 text-center">
                <p className="text-base font-semibold leading-none text-black">{startups.length}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-black/40">Startups</p>
              </div>
              <div className="min-w-[84px] rounded-xl border border-black/8 bg-black/[0.02] px-3.5 py-2 text-center">
                <p className="text-base font-semibold leading-none text-black">{startups.filter((s) => s.status === "approved").length}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-black/40">Live</p>
              </div>
            </div>
          </div>
        </header>


        <div className="mt-6 grid gap-5 md:mt-8 md:grid-cols-[232px_1fr] md:gap-8">
          {/* Left nav rail */}
          <nav className="md:sticky md:top-6 md:self-start">
            <p className="mb-2 hidden px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-black/30 md:block">Settings</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-black/8 bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:flex md:flex-col md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              {TABS.map(({ key, label, desc, icon: Icon }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex min-w-0 items-center justify-center gap-2 rounded-lg px-2.5 py-2.5 text-center transition-all md:w-full md:justify-start md:gap-3 md:rounded-xl md:px-3.5 md:py-3 md:text-left ${
                      active
                        ? "bg-black/[0.05] text-black md:bg-white md:shadow-[0_6px_24px_-14px_rgba(0,0,0,0.35)] md:ring-1 md:ring-black/10"
                        : "text-black/45 hover:text-black md:hover:bg-white/70"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 hidden h-6 w-[3px] -translate-y-1/2 rounded-full bg-black transition-opacity md:block ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${
                        active ? "bg-black text-white" : "bg-black/[0.05] text-black/40 group-hover:text-black/70"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-[13px] font-medium tracking-tight md:text-sm ${active ? "text-black" : ""}`}>{label}</span>
                      <span className="hidden text-[11px] leading-snug text-black/35 md:block">{desc}</span>
                    </span>
                    {key === "startups" && startups.length > 0 && (
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium md:ml-auto md:px-2 ${active ? "bg-black/[0.08] text-black/60" : "bg-black/[0.04] text-black/40"}`}>
                        {startups.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>


          {/* Right panel */}
          <div key={tab} className="page-enter min-w-0">
            {tab === "profile" ? (
            <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
              <div className="mb-5 border-b border-black/6 pb-4">
                <h2 className="text-base font-semibold tracking-tight text-black">Profile</h2>
                <p className="mt-1 text-xs text-black/40">Your name, photo, and email. Email cannot be changed.</p>
              </div>
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-black/6 bg-black/[0.015] p-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-black/6 ring-1 ring-black/8">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><User className="h-5 w-5 text-black/40" /></div>
                    )}
                  </div>
                  <div className="min-w-[150px] flex-1">
                    <p className="text-xs font-medium text-black/60">Profile picture</p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarPick}
                      />
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-black/12 bg-white px-3 py-1.5 text-xs font-medium text-black/60 hover:border-black/25 hover:text-black transition-all disabled:opacity-40"
                      >
                        <Upload className="h-3 w-3" />
                        {uploadingAvatar ? "Uploading…" : avatarUrl ? "Replace photo" : "Upload photo"}
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          title="Remove photo"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-black/30 hover:bg-black/5 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] text-black/35">Shown as your founder photo on public startup pages.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-black/60">Display name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-black/60">X (Twitter) handle</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-black/40">@</span>
                      <input
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="yourhandle"
                        className={`${inputCls} pl-7`}
                      />
                    </div>
                  </div>
                </div>
                <p className="-mt-2 text-[10px] text-black/35">Your handle appears next to your founder photo on public startup pages. Paste a handle, @handle, or X profile URL.</p>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-black/60">
                    Email
                    <span className="ml-2 text-[10px] font-normal text-black/30">Cannot be changed</span>
                  </label>
                  <input value={email} disabled className={inputCls} />
                </div>

                <div className="flex items-center justify-end border-t border-black/6 pt-4">
                  <button type="submit" disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all disabled:opacity-50">
                    <Save className="h-3.5 w-3.5" />
                    {savingProfile ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </form>
            </div>
            ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2 pb-1">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-black">Your startups</h2>
                  <p className="mt-1 text-xs text-black/40">Each startup has its own embed script and appears independently in the network.</p>
                </div>
              </div>
              {startups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/5">
                    <Globe className="h-4.5 w-4.5 text-black/30" />
                  </div>
                  <p className="text-sm font-medium text-black">No startups yet</p>
                  <p className="mt-1 text-xs text-black/40">List your first startup to join the network.</p>
                  <Link to="/apply"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 transition-all">
                    <Plus className="h-3.5 w-3.5" /> Apply your first startup
                  </Link>
                </div>
              ) : (
                <>
                  {startups.map((s) => (
                    <StartupCard key={s.id} startup={s} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                  <Link to="/apply"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-white py-4 text-sm font-medium text-black/50 hover:border-black/30 hover:bg-black/[0.015] hover:text-black transition-all">
                    <Plus className="h-4 w-4" /> Add another startup
                  </Link>
                </>
              )}
            </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
    <AvatarCropDialog
      file={pendingAvatarFile}
      onCancel={() => setPendingAvatarFile(null)}
      onConfirm={uploadCroppedAvatar}
    />
    </>
  );
}

