import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM = "StartupBar <hello@startupbar.co>";
const ADMIN_EMAIL = "danielabinav16@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string | string[], subject: string, html: string) {
  const toList = Array.isArray(to) ? to : [to];
  const bcc = toList.map((t) => t.toLowerCase()).includes(ADMIN_EMAIL.toLowerCase()) ? undefined : ADMIN_EMAIL;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html, ...(bcc ? { bcc } : {}) }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// Get or create a stable one-click unsubscribe token for an email.
async function getOrCreateUnsubToken(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  if (existing?.token) return existing.token as string;
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const { data: inserted } = await supabase
    .from("email_unsubscribe_tokens")
    .insert({ email: normalized, token })
    .select("token")
    .maybeSingle();
  if (inserted?.token) return inserted.token as string;
  // Race: another concurrent insert won — re-read.
  const { data: reread } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  return (reread?.token as string) ?? token;
}

function unsubscribeFooterHtml(url: string) {
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:11px;line-height:1.6;color:#a1a1aa;text-align:center;">
    You're getting this because you signed up at <a href="https://startupbar.co" style="color:#a1a1aa;text-decoration:none;">startupbar.co</a>.
    <br>Don't want these updates? <a href="${url}" style="color:#71717a;text-decoration:underline;">Unsubscribe in one click</a>. Important account emails (approvals, warnings) will still be sent.
  </div>`;
}

// Extra headers for marketing sends → enables Gmail/Apple one-click and
// keeps us on the right side of RFC 8058.
function marketingHeaders(unsubUrl: string) {
  return {
    "List-Unsubscribe": `<${unsubUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

// Branded shell used by every email type.
function shell(opts: { heading: string; bodyHtml: string; signoff?: string }) {
  const signoff = opts.signoff ?? "— Abinav from StartupBar";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td style="padding:4px 8px 20px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:#0a0a0a;border-radius:999px;width:28px;height:10px;font-size:0;line-height:0;">&nbsp;</td>
            <td style="padding-left:10px;font-size:14px;font-weight:600;color:#0a0a0a;letter-spacing:-0.01em;">StartupBar</td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:14px;padding:36px 36px 32px 36px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <h1 style="margin:0 0 20px 0;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#0a0a0a;">${opts.heading}</h1>
          ${opts.bodyHtml}
          <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#71717a;">${signoff}</p>
        </td></tr>
        <tr><td style="padding:20px 8px 0 8px;font-size:12px;line-height:1.6;color:#a1a1aa;text-align:center;">
          © 2026 StartupBar · <a href="https://startupbar.co" style="color:#a1a1aa;text-decoration:none;">startupbar.co</a> · <a href="https://startupbar.co/privacy" style="color:#a1a1aa;text-decoration:none;">Privacy</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#27272a;">${text}</p>`;

const strong = (text: string) => `<strong style="color:#0a0a0a;">${text}</strong>`;

const escapeHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Require an authenticated caller for every email type. Prevents anyone on
    // the internet from spamming arbitrary addresses or triggering misleading
    // "official" founder emails by POSTing directly to this function.
    const authHeaderTop = req.headers.get("Authorization") ?? "";
    const bearerTop = authHeaderTop.replace("Bearer ", "").trim();
    if (!bearerTop) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: callerData, error: callerErr } = await supabase.auth.getUser(bearerTop);
    if (callerErr || !callerData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = callerData.user;
    const callerEmail = (caller.email ?? "").toLowerCase();
    const isAdmin = callerEmail === ADMIN_EMAIL.toLowerCase();

    // Founder-targeted moderation types must only be triggered by the admin.
    const adminOnlyTypes = new Set([
      "startup-approved",
      "startup-rejected",
      "startup-warning",
      "startup-removed-no-widget",
    ]);
    if (adminOnlyTypes.has(type) && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let html = "";
    let to: string | string[] = "";


    // ---- Admin broadcast: custom subject + body to a recipient segment ----
    if (type === "admin-broadcast" || type === "admin-broadcast-preview" || type === "admin-broadcast-recipients" || type === "admin-unsub-reasons") {
      // Verify caller is admin
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || userData.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const segment: string = data?.segment ?? "all";

      // Compute recipients per segment
      async function getRecipients(): Promise<{ email: string; name: string; userId: string }[]> {
        const perPage = 1000;
        let page = 1;
        const users: { id: string; email: string; name: string }[] = [];
        // paginate up to 5000 users
        for (let i = 0; i < 5; i++) {
          const { data: u, error } = await supabase.auth.admin.listUsers({ page, perPage });
          if (error) throw error;
          const list = u?.users ?? [];
          for (const usr of list) {
            if (!usr.email) continue;
            users.push({ id: usr.id, email: usr.email, name: (usr.user_metadata?.full_name as string | undefined) ?? "" });
          }
          if (list.length < perPage) break;
          page += 1;
        }

        const { data: startups } = await supabase.from("startups").select("user_id,status");

        // Founders who reached step 2 of apply ("install the script") — the
        // audience that got all the way to the install wall and stopped.
        const reachedStep2 = new Set<string>();
        if (segment === "step2_no_startup") {
          const { data: ev } = await supabase
            .from("application_events")
            .select("applicant_user_id,metadata")
            .eq("event_type", "apply_step")
            .not("applicant_user_id", "is", null)
            .limit(5000);
          for (const e of (ev as { applicant_user_id: string; metadata: any }[] | null) ?? []) {
            if (Number(e?.metadata?.step ?? 0) >= 2) reachedStep2.add(e.applicant_user_id);
          }
        }
        const byUser = new Map<string, string[]>();
        for (const s of (startups as { user_id: string; status: string }[] | null) ?? []) {
          const arr = byUser.get(s.user_id) ?? [];
          arr.push(s.status);
          byUser.set(s.user_id, arr);
        }

        // Load unsubscribe suppressions once and drop those recipients.
        const { data: sup } = await supabase.from("suppressed_emails").select("email");
        const suppressedSet = new Set((sup ?? []).map((r: any) => String(r.email).toLowerCase()));

        return users
          .filter((u) => {
            const statuses = byUser.get(u.id) ?? [];
            switch (segment) {
              case "all": return true;
              case "no_startup": return statuses.length === 0;
              case "step2_no_startup": return statuses.length === 0 && reachedStep2.has(u.id);
              case "has_startup": return statuses.length > 0;
              case "approved_only": return statuses.includes("approved");
              case "pending_only": return statuses.includes("pending") && !statuses.includes("approved");
              case "rejected_only": return statuses.length > 0 && statuses.every((s) => s === "rejected");
              default: return false;
            }
          })
          .filter((u) => !suppressedSet.has(u.email.toLowerCase()))
          .map((u) => ({ email: u.email, name: u.name, userId: u.id }))
          // Stable order so "batch 2" means the same people tomorrow as today.
          .sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()));
      }

      // Daily-limit batching: the admin picks a batch size (default 80) and a
      // 1-based batch number; 0 means "everyone".
      const batchSize = Math.max(0, Math.min(1000, Number(data?.batchSize ?? 0) || 0));
      const batchIndex = Math.max(1, Number(data?.batchIndex ?? 1) || 1);
      function sliceBatch<T>(list: T[]): T[] {
        if (!batchSize) return list;
        const start = (batchIndex - 1) * batchSize;
        return list.slice(start, start + batchSize);
      }

      // Recipient counts (post-suppression) plus a raw pre-suppression total
      // so admins see how many are opted-out for this segment.
      async function segmentSuppressedCount(): Promise<number> {
        // Cheap: count all rows in suppressed_emails. Segment membership check
        // isn't worth the extra roundtrip for a UI-only hint.
        const { count } = await supabase.from("suppressed_emails").select("*", { count: "exact", head: true });
        return count ?? 0;
      }

      // Markdown-lite → HTML (safe)
      function renderBody(md: string): string {
        const escaped = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // links [text](url) — url must be http(s)
        let s = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" style="color:#0a0a0a;text-decoration:underline;">$1</a>');
        // bold **text**
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#0a0a0a;">$1</strong>');
        // split into blocks by blank lines
        const blocks = s.split(/\n\s*\n/);
        return blocks.map((block) => {
          const lines = block.split(/\n/);
          if (lines.every((l) => l.trim().startsWith("- "))) {
            const items = lines.map((l) => `<li style="margin:0 0 6px 0;">${l.replace(/^\s*-\s+/, "")}</li>`).join("");
            return `<ul style="margin:0 0 16px 20px;padding:0;font-size:15px;line-height:1.6;color:#27272a;">${items}</ul>`;
          }
          return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#27272a;">${lines.join("<br>")}</p>`;
        }).join("");
      }

      // Recipients-only lookup for UI count
      if (type === "admin-broadcast-recipients") {
        const list = await getRecipients();
        const unsubscribed = await segmentSuppressedCount();
        return new Response(JSON.stringify({
          count: list.length,
          unsubscribed,
          sample: list.slice(0, 5).map((r) => r.email),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Aggregate unsubscribe reasons for admin analytics
      if (type === "admin-unsub-reasons") {
        const { data: rows } = await supabase
          .from("suppressed_emails")
          .select("email,reason,metadata,created_at")
          .eq("reason", "unsubscribe")
          .order("created_at", { ascending: false });
        const list = (rows ?? []) as Array<{ email: string; metadata: any; created_at: string }>;
        const counts: Record<string, number> = {};
        const recent: Array<{ email: string; reason: string; details: string | null; at: string }> = [];
        for (const r of list) {
          const code = (r.metadata?.reason_code as string) ?? "unspecified";
          counts[code] = (counts[code] ?? 0) + 1;
          if (recent.length < 25) {
            recent.push({
              email: r.email,
              reason: code,
              details: (r.metadata?.details as string) ?? null,
              at: r.created_at,
            });
          }
        }
        return new Response(JSON.stringify({ total: list.length, counts, recent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }


      const subjectIn: string = (data?.subject ?? "").toString().trim();
      const headlineIn: string = (data?.headline ?? subjectIn).toString().trim();
      const bodyIn: string = (data?.bodyMarkdown ?? "").toString();
      if (!subjectIn || !bodyIn.trim()) {
        return new Response(JSON.stringify({ error: "Missing subject or body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const bodyHtml = renderBody(bodyIn);
      // Preview uses a dummy token so the footer renders in the composer.
      const previewHtml = shell({
        heading: headlineIn || subjectIn,
        bodyHtml: bodyHtml + unsubscribeFooterHtml("https://startupbar.co/u/preview"),
      });

      // Preview render — return HTML for the panel
      if (type === "admin-broadcast-preview") {
        return new Response(JSON.stringify({ html: previewHtml }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Send. Personalization uses {{name}} in subject/body (optional).
      const testOnly: boolean = !!data?.testOnly;
      const recipients = testOnly
        ? [{ email: ADMIN_EMAIL, name: "Admin", userId: "" }]
        : await getRecipients();

      // Send one email, returning {ok, status, message}. Retries once on 429.
      async function sendOne(toAddr: string, subj: string, htmlBody: string, extraHeaders: Record<string, string>): Promise<{ ok: boolean; status: number; message: string }> {
        const bcc = toAddr.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? undefined : ADMIN_EMAIL;
        const doFetch = () => fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM,
            to: toAddr,
            subject: subj,
            html: htmlBody,
            headers: extraHeaders,
            ...(bcc ? { bcc } : {}),
          }),
        });
        let res = await doFetch();
        if (res.status === 429) {
          const ra = Number(res.headers.get("retry-after") ?? "1");
          await new Promise((r) => setTimeout(r, Math.max(1000, ra * 1000)));
          res = await doFetch();
        }
        const text = res.ok ? "" : (await res.text()).slice(0, 300);
        return { ok: res.ok, status: res.status, message: text };
      }

      // Sending is paced at ~550ms/recipient, so anything beyond ~250 people
      // blows past the 150s edge-function idle timeout. Run the loop as a
      // background task and answer the client immediately.
      async function runBroadcast(): Promise<{ sent: number; errors: { email: string; error: string }[] }> {
        let sent = 0;
        const errors: { email: string; error: string }[] = [];
        for (const r of recipients) {
          const firstName = (r.name || "").split(" ")[0] || "there";
          const personalizedSubject = subjectIn.replace(/\{\{\s*name\s*\}\}/gi, firstName);
          const personalizedBody = bodyHtml.replace(/\{\{\s*name\s*\}\}/gi, firstName);
          const token = await getOrCreateUnsubToken(supabase, r.email);
          const unsubUrl = `https://startupbar.co/u/${token}`;
          const html = shell({
            heading: (headlineIn || subjectIn).replace(/\{\{\s*name\s*\}\}/gi, firstName),
            bodyHtml: personalizedBody + unsubscribeFooterHtml(unsubUrl),
          });
          try {
            const result = await sendOne(r.email, personalizedSubject, html, marketingHeaders(unsubUrl));
            if (result.ok) {
              sent += 1;
            } else {
              const msg = `HTTP ${result.status} ${result.message}`;
              console.error(`broadcast send failed for ${r.email}: ${msg}`);
              errors.push({ email: r.email, error: msg });
            }
          } catch (e) {
            const msg = String(e).slice(0, 200);
            console.error(`broadcast send exception for ${r.email}: ${msg}`);
            errors.push({ email: r.email, error: msg });
          }
          // Pace under Resend's 2 req/s default rate limit
          await new Promise((res) => setTimeout(res, 550));
        }
        console.log(`broadcast finished: sent ${sent}/${recipients.length}, failed ${errors.length}`);
        return { sent, errors };
      }

      // Test send is a single email — keep it synchronous so the admin sees the result.
      if (testOnly) {
        const { sent, errors } = await runBroadcast();
        return new Response(JSON.stringify({ sent, failed: errors.length, total: recipients.length, errors: errors.slice(0, 25) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const task = runBroadcast().catch((e) => console.error("broadcast task failed:", String(e)));
      const waitUntil = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil;
      if (waitUntil) waitUntil(task);

      return new Response(JSON.stringify({ queued: true, total: recipients.length, sent: 0, failed: 0, errors: [] }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // ---- Admin notification: no startup row lookup, sends to admin only ----
    if (type === "admin-new-application") {
      const startupName = escapeHtml(data?.startupName ?? "Unknown");
      const startupUrlRaw = String(data?.startupUrl ?? "").trim();
      // Only allow http/https so the anchor can't turn into a javascript: URL.
      // If the applicant submitted a bare domain (no scheme), try https://
      // before falling back to a placeholder so admins still get a live link.
      let startupUrlSafe = "#";
      const tryParse = (raw: string) => {
        try {
          const u = new URL(raw);
          if (u.protocol === "http:" || u.protocol === "https:") return u.href;
        } catch { /* fall through */ }
        return null;
      };
      startupUrlSafe = tryParse(startupUrlRaw) ?? (startupUrlRaw ? tryParse(`https://${startupUrlRaw}`) : null) ?? "#";

      const startupUrlAttr = escapeHtml(startupUrlSafe);
      const startupUrlText = escapeHtml(startupUrlRaw);
      const description = escapeHtml(data?.description ?? "");
      const applicantEmail = escapeHtml(data?.applicantEmail ?? "unknown");

      to = ADMIN_EMAIL;
      subject = `🆕 New application: ${startupName}`;
      html = shell({
        heading: "New startup application",
        bodyHtml: `
          ${p(`A new application just landed in the review queue.`)}
          <div style="margin:0 0 20px 0;border:1px solid #e4e4e7;border-radius:10px;padding:16px 18px;background:#fafafa;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Startup</p>
            <p style="margin:0 0 14px 0;font-size:16px;font-weight:600;color:#0a0a0a;">${startupName}</p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Website</p>
            <p style="margin:0 0 14px 0;font-size:14px;"><a href="${startupUrlAttr}" style="color:#0a0a0a;">${startupUrlText}</a></p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">One-liner</p>
            <p style="margin:0 0 14px 0;font-size:14px;color:#27272a;">${description}</p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Applicant</p>
            <p style="margin:0;font-size:14px;color:#27272a;">${applicantEmail}</p>
          </div>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#27272a;">
            <a href="https://startupbar.co/admin" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">Review in admin →</a>
          </p>
        `,
        signoff: "— StartupBar bot",
      });

      await sendEmail(to, subject, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- Founder submission confirmation (no startupId required) ----
    if (type === "startup-submitted" || type === "welcome") {
      // Recipient email is always the authenticated caller — never trust the
      // request body, or anyone could send fake confirmations to any address.
      const email = caller.email;
      if (!email) return new Response("No email", { status: 400, headers: corsHeaders });

      // The welcome email is once per account, ever. Claim it atomically so a
      // second browser, device or private window can't trigger a duplicate.
      if (type === "welcome") {
        const stamp = new Date().toISOString();
        // Not every account has a profile row yet, so try to create one first.
        // A unique-violation means the row exists — fall back to a conditional
        // claim that only succeeds when nobody has been welcomed yet.
        const ins = await supabase
          .from("profiles")
          .insert({ id: caller.id, welcome_email_sent_at: stamp })
          .select("id");
        let claimedIt = !ins.error && (ins.data?.length ?? 0) > 0;
        if (ins.error) {
          const upd = await supabase
            .from("profiles")
            .update({ welcome_email_sent_at: stamp })
            .eq("id", caller.id)
            .is("welcome_email_sent_at", null)
            .select("id");
          claimedIt = !upd.error && (upd.data?.length ?? 0) > 0;
        }
        if (!claimedIt) {
          return new Response(JSON.stringify({ ok: true, skipped: "already-welcomed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      const founderNameRaw = ((data?.name as string | undefined) ?? (caller.user_metadata?.full_name as string | undefined) ?? "");
      const founderName = escapeHtml(founderNameRaw.split(" ")[0] || "Founder");
      const startupName = escapeHtml(data?.startupName ?? "your startup");

      to = email;
      subject = type === "welcome"
        ? `Welcome to StartupBar`
        : `We received your StartupBar application — ${data?.startupName ?? "your startup"}`;
      html = shell({
        heading: type === "welcome" ? "Welcome 👋" : "Application received ✓",
        bodyHtml: type === "welcome"
          ? `
            ${p(`Hi ${founderName},`)}
            ${p(`Welcome to StartupBar. Head to your dashboard to submit your startup and get free traffic from the network.`)}
          `
          : `
            ${p(`Hi ${founderName},`)}
            ${p(`Thanks for applying to StartupBar. We've received your application for ${strong(startupName)} and it's now in our review queue.`)}
            ${p(`We review every application within ${strong("24 hours")}. You'll get another email the moment ${startupName} goes live across the network.`)}
            ${p(`In the meantime, make sure the embed snippet stays installed on your site — we check for it during review.`)}
          `,
      });

      await sendEmail(to, subject, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // ---- Founder-targeted types that DO need a startup lookup ----
    const { data: startup } = await supabase
      .from("startups")
      .select("name, website_url, user_id")
      .eq("id", data.startupId)
      .single();

    if (!startup) return new Response("Startup not found", { status: 404, headers: corsHeaders });

    const { data: authUser } = await supabase.auth.admin.getUserById((startup as any).user_id);
    const email = authUser?.user?.email;
    const founderName = (authUser?.user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "Founder";
    if (!email) return new Response("No email", { status: 400, headers: corsHeaders });

    const name = startup.name;
    const site = startup.website_url;
    to = email;

    if (type === "startup-approved") {
      subject = `🎉 ${name} is now live on StartupBar`;
      html = shell({
        heading: "You're live. 🎉",
        bodyHtml: `
          ${p(`Hi ${founderName},`)}
          ${p(`${strong(name)} has been approved and is now showing across the StartupBar network. Other founders' sites are already discovering your startup.`)}
          ${p(`Keep the embed code on your site as long as you'd like to be featured across the StartupBar network — if it's removed, your startup will stop being shown to other founders.`)}
        `,
      });
    } else if (type === "startup-rejected") {
      const reason: string = data?.reason ?? "generic";
      const customNote: string = (data?.note ?? "").toString().trim();

      const REASONS: Record<string, { subject: string; heading: string; reasonLine: string; body: string }> = {
        not_allowed_type: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Your site type isn't a fit",
          reasonLine: "Site type isn't allowed on StartupBar",
          body: `
            ${p(`Thanks for applying to StartupBar. After reviewing ${strong(name)}, we're unable to approve it because the site type doesn't fit the kind of products we feature on the network.`)}
            ${p(`StartupBar is built for live SaaS, indie products and founder-led startups. Directories, affiliate sites, adult content, gambling, scrapers and link-farms aren't allowed.`)}
            ${p(`If you're building something else under the same brand, you're welcome to reapply with that project.`)}
          `,
        },
        widget_hidden: {
          subject: `Action needed: StartupBar widget is hidden on ${site}`,
          heading: "Widget is installed but hidden",
          reasonLine: "Widget bar is hidden on your site",
          body: `
            ${p(`We found the StartupBar script on ${strong(site)} — but the widget bar is being hidden (CSS display:none, visibility:hidden, 0-height wrapper, or a parent element clipping it).`)}
            ${p(`The network only works when every member shows the bar to their visitors. Hiding it breaks the mutual-exchange that gives every startup free traffic — so we can't approve ${strong(name)} while it's hidden.`)}
            ${p(`Remove the CSS that hides the iframe, then reapply at <a href="https://startupbar.co/apply" style="color:#0a0a0a;">startupbar.co/apply</a> and we'll take another look right away.`)}
          `,
        },
        csp_blocked: {
          subject: `Action needed: your CSP is blocking StartupBar on ${site}`,
          heading: "Your CSP is blocking our widget script",
          reasonLine: "Content Security Policy blocks startupbar.co/widget/loader.js",
          body: `
            ${p(`The StartupBar embed snippet is on ${strong(site)}, but your site's ${strong("Content Security Policy")} is refusing to let the browser load ${strong("https://startupbar.co/widget/loader.js")}. That means the bar never actually renders for your visitors, so we can't approve ${strong(name)} until it's fixed.`)}
            ${p(`Add ${strong("https://startupbar.co")} to your ${strong("script-src")} (and ideally ${strong("frame-src")}) directive. Example:`)}
            ${p(`<code style="display:block;background:#0a0a0a;color:#e4e4e7;padding:12px 14px;border-radius:8px;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.55;overflow-x:auto;">Content-Security-Policy: script-src 'self' https://startupbar.co; frame-src https://startupbar.co;</code>`)}
            ${p(`Once the policy is updated, reapply at <a href="https://startupbar.co/apply" style="color:#0a0a0a;">startupbar.co/apply</a> and we'll re-check within a few hours.`)}
          `,
        },
        csp_frame_blocked: {
          subject: `Action needed: your CSP is blocking the StartupBar bar on ${site}`,
          heading: "Your CSP is blocking the widget iframe",
          reasonLine: "Content Security Policy blocks the startupbar.co widget iframe",
          body: `
            ${p(`Good news first — our script ${strong("loads fine")} on ${strong(site)}. The problem is one step later: your ${strong("Content Security Policy")} is refusing to let the browser render the actual bar, so your visitors see a ${strong("broken frame icon")} at the top of the page where the StartupBar should be. We can't approve ${strong(name)} while the bar is broken for real users.`)}
            ${p(`The exact cause: your CSP has ${strong("no frame-src directive")}, so it falls back to ${strong("default-src 'self'")} — and that blocks the iframe we load from ${strong("https://startupbar.co")}.`)}
            ${p(`Add ${strong("frame-src")} for startupbar.co (and, if your CSP restricts images, allow favicon hosts too so the shown startup's logo can render). Full working policy:`)}
            ${p(`<code style="display:block;background:#0a0a0a;color:#e4e4e7;padding:12px 14px;border-radius:8px;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;">Content-Security-Policy:
  script-src 'self' https://startupbar.co;
  frame-src  https://startupbar.co;
  img-src    'self' data: https://www.google.com https://*.googleusercontent.com;</code>`)}
            ${p(`Just merge those three lines into your existing CSP (don't replace it wholesale — keep whatever else you already allow). If you're on Vercel/Next.js this usually lives in ${strong("next.config.js")} headers or ${strong("middleware.ts")}; on Cloudflare it's a Transform Rule; on most Node/Express apps it's in ${strong("helmet")} config.`)}
            ${p(`Once your CSP is updated and deployed, please ${strong("reapply")} at <a href="https://startupbar.co/apply" style="color:#0a0a0a;">startupbar.co/apply</a> — we'll re-check within a few hours and approve you as soon as the bar renders properly.`)}
          `,
        },
        widget_not_installed: {
          subject: `${name} — StartupBar widget not installed`,
          heading: "Widget snippet not found",
          reasonLine: "StartupBar widget is not installed",
          body: `
            ${p(`We couldn't find the StartupBar embed script on ${strong(site)}. Every startup on the network needs the widget live before it can be approved.`)}
            ${p(`Add the snippet from your <a href="https://startupbar.co/dashboard" style="color:#0a0a0a;">dashboard</a> into the ${strong("&lt;head&gt;")} of your site, then reapply — approval usually happens within a few hours.`)}
          `,
        },
        low_quality: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Site isn't ready yet",
          reasonLine: "Site doesn't meet quality standards yet",
          body: `
            ${p(`Thanks for applying. After reviewing ${strong(name)}, the site doesn't quite meet the bar for the network yet — most often that's placeholder content, a broken landing page, missing product information, or a "coming soon" page.`)}
            ${p(`Once the site has a working product page with a clear value proposition, you're very welcome to reapply.`)}
          `,
        },
        duplicate: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Duplicate submission",
          reasonLine: "Duplicate submission detected",
          body: `
            ${p(`${strong(name)} (or another submission for ${strong(site)}) is already in our system, so we've closed this duplicate application.`)}
            ${p(`If you're locked out of the original account, just reply to this email and we'll help you regain access.`)}
          `,
        },
        broken_site: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "We couldn't load your site",
          reasonLine: "Your site couldn't be reached",
          body: `
            ${p(`We tried to review ${strong(name)} but ${strong(site)} wouldn't load — it returned an error, timed out, or wasn't reachable from our servers.`)}
            ${p(`Once the site is back up and serving normally, please reapply at <a href="https://startupbar.co/apply" style="color:#0a0a0a;">startupbar.co/apply</a>.`)}
          `,
        },
        generic: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Update on your application",
          reasonLine: "Does not meet approval criteria at this time",
          body: `
            ${p(`Thank you for applying to StartupBar. After reviewing ${strong(name)}, we're unable to approve it at this time.`)}
            ${p(`If you think this was a mistake or would like to reapply with changes, just reply to this email and we'll take another look.`)}
          `,
        },
      };

      const r = REASONS[reason] ?? REASONS.generic;
      const reasonBlock = `<div style="margin:0 0 20px 0;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;color:#27272a;"><span style="display:inline-block;background:#0a0a0a;color:#ffffff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-radius:4px;padding:3px 8px;margin-right:8px;vertical-align:middle;">Reason</span>${r.reasonLine}</div>`;
      const noteBlock = customNote
        ? `<div style="margin:0 0 16px 0;border-left:3px solid #0a0a0a;background:#fafafa;padding:12px 14px;border-radius:6px;font-size:14px;line-height:1.6;color:#27272a;">${customNote.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>`
        : "";
      subject = r.subject;
      html = shell({ heading: r.heading, bodyHtml: p(`Hi ${founderName},`) + reasonBlock + r.body + noteBlock });
    } else if (type === "startup-warning") {
      const snippet = `&lt;script async src="https://startupbar.co/widget/loader.js" data-startup-id="YOUR_ID"&gt;&lt;/script&gt;`;
      subject = `⚠️ Action required: StartupBar widget not detected on ${site}`;
      html = shell({
        heading: "Widget not detected ⚠️",
        bodyHtml: `
          ${p(`Hi ${founderName},`)}
          ${p(`We noticed the StartupBar widget is no longer detected on ${strong(site)}.`)}
          ${p(`Please reinstall the widget snippet within ${strong("48 hours")} to stay in the network. If the widget is still missing after that, ${name} will be automatically removed.`)}
          ${p(`The snippet to add to your ${strong("&lt;head&gt;")}:`)}
          <pre style="margin:0 0 16px 0;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;font-size:13px;line-height:1.5;color:#0a0a0a;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">${snippet}</pre>
          ${p(`You can grab your exact snippet (with your startup ID) from your <a href="https://startupbar.co/dashboard" style="color:#0a0a0a;">dashboard</a>.`)}
          ${p(`If you've already reinstalled it, no action is needed — we'll verify it shortly.`)}
        `,
      });
    } else if (type === "startup-removed-no-widget") {
      subject = `${name} has been removed from StartupBar`;
      html = shell({
        heading: "Your startup has been removed",
        bodyHtml: `
          ${p(`Hi ${founderName},`)}
          ${p(`We're writing to let you know that ${strong(name)} has been removed from the StartupBar network.`)}
          ${p(`${strong("Reason:")} The StartupBar widget was not detected on ${strong(site)} after the 48-hour grace period we issued.`)}
          ${p(`Every startup in the network is required to keep the widget installed — that mutual exchange is what makes free traffic work for everyone.`)}
          ${p(`If you reinstall the widget and want to rejoin, you're welcome to reapply at <a href="https://startupbar.co/apply" style="color:#0a0a0a;">startupbar.co/apply</a>.`)}
        `,
      });
    } else {
      return new Response("Unknown email type", { status: 400, headers: corsHeaders });
    }

    await sendEmail(to, subject, html);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
