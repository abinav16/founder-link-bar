import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeHtml, shell, section } from "./template.ts";
import { FROM, appEmailCc } from "./delivery.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SUBJECT = "Your StartupBar stats this week ✦";
const TEMPLATE = "weekly-digest";
// Hard daily cap keeps the rest of Resend's 100/day free quota for account emails.
const DAILY_CAP = 50;
// One digest per founder per ~week, regardless of how many daily runs happen.
const DEDUPE_WINDOW_MS = 6.5 * 24 * 60 * 60 * 1000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getOrCreateUnsubToken(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const { data: existing } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  if (existing?.token) return existing.token as string;
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const { data: inserted } = await admin
    .from("email_unsubscribe_tokens")
    .insert({ email: normalized, token })
    .select("token")
    .maybeSingle();
  if (inserted?.token) return inserted.token as string;
  const { data: reread } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  if (!reread?.token) throw new Error('Cannot send without a working unsubscribe link');
  return reread.token as string;
}

async function sendEmail(to: string, html: string, unsubUrl: string, idempotencyKey: string, firstVerified = false) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      from: FROM,
      to,
      ...appEmailCc(to),
      subject: firstVerified ? 'Your first verified StartupBar signup — and weekly stats' : SUBJECT,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Require a real service-role credential to prevent mass-email abuse.
  // The cron passes the vault-stored service key; it may differ in format
  // from this runtime's env key, so verify it against the admin API.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  let authorized = !!token && token === SUPABASE_SERVICE_ROLE_KEY;
  const jobToken = req.headers.get("x-job-token")?.trim();
  if (!authorized && jobToken && jobToken.length >= 32) {
    const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await a.from("internal_job_tokens").select("token").eq("name", "weekly-digest").maybeSingle();
    authorized = !!data?.token && data.token === jobToken;
  }
  if (!authorized && token && !token.startsWith("sb_publishable_")) {
    try {
      const probe = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
        headers: { apikey: token, Authorization: `Bearer ${token}` },
      });
      authorized = probe.ok;
    } catch { authorized = false; }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Optional: { testEmail } sends ONE digest to that address only (for preview).
  let body: { testEmail?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const testEmail = body.testEmail?.trim().toLowerCase() || null;

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: startups, error: sErr } = await admin
      .from("startups")
      .select("id, name, website_url, logo_url, user_id, banned, widget_last_heartbeat_at, created_at")
      .eq("status", "approved")
      .eq("banned", false)
      // Only startups listed for a full week get a weekly summary.
      .lte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (sErr) throw sErr;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    // A founder gets at most one digest per this window, no matter how often the job runs.
    const dedupeSince = new Date(now.getTime() - DEDUPE_WINDOW_MS).toISOString();

    const { data: allImps, error: impErr } = await admin.rpc(
      "digest_impression_counts",
      { _since: sevenDaysAgo },
    );
    if (impErr) throw impErr;
    const impCount = new Map<string, number>();
    (allImps ?? []).forEach((r: any) => {
      impCount.set(r.shown_startup_id, Number(r.cnt) || 0);
    });

    type DigestStartup = { id: string; name: string; websiteUrl: string; logoUrl: string | null; hb: string | null };
    const byUser = new Map<string, DigestStartup[]>();
    for (const s of startups ?? []) {
      const owned = byUser.get(s.user_id) ?? [];
      owned.push({ id: s.id, name: s.name, websiteUrl: s.website_url, logoUrl: s.logo_url, hb: s.widget_last_heartbeat_at });
      byUser.set(s.user_id, owned);
    }

    const { data: sup, error: suppressionError } = await admin.from("suppressed_emails").select("email");
    if (suppressionError) throw suppressionError;
    const suppressedSet = new Set((sup ?? []).map((r: any) => String(r.email).toLowerCase()));

    // Who already got (or is getting) a digest inside the dedupe window.
    const { data: recentLogs } = await admin
      .from("email_send_log")
      .select("recipient_email, status")
      .eq("template_name", TEMPLATE)
      .in("status", ["sent", "pending"])
      .gte("created_at", dedupeSince);
    const alreadySent = new Set((recentLogs ?? []).map((r: any) => String(r.recipient_email).toLowerCase()));

    // Last digest date per email (for fair oldest-first ordering).
    const { data: lastLogs } = await admin
      .from("email_send_log")
      .select("recipient_email, created_at")
      .eq("template_name", TEMPLATE)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(2000);
    const lastSentAt = new Map<string, number>();
    for (const r of lastLogs ?? []) {
      const e = String(r.recipient_email).toLowerCase();
      if (!lastSentAt.has(e)) lastSentAt.set(e, new Date(r.created_at).getTime());
    }

    let sent = 0;
    let skipped = 0;
    const skipReasons: Record<string, number> = {};
    const skip = (why: string) => { skipped++; skipReasons[why] = (skipReasons[why] ?? 0) + 1; };
    const errors: Array<{ userId: string; error: string }> = [];

    // Build the eligible candidate list first, then cap it.
    type Candidate = { userId: string; email: string; user: any; startups: DigestStartup[] };
    const candidates: Candidate[] = [];
    const seenEmails = new Set<string>();
    const activeSince = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    for (const [userId, userStartups] of byUser) {
      const { data: { user } } = await admin.auth.admin.getUserById(userId);
      if (!user?.email) { skip("no_email"); continue; }
      const email = user.email.trim().toLowerCase();
      if (testEmail && email !== testEmail) continue;
      if (seenEmails.has(email)) { skip("duplicate"); continue; }
      seenEmails.add(email);
      if (suppressedSet.has(email)) { skip("suppressed"); continue; }
      const acct = user as unknown as {
        deleted_at?: string | null;
        banned_until?: string | null;
        email_confirmed_at?: string | null;
        confirmed_at?: string | null;
        is_anonymous?: boolean;
      };
      const bannedUntil = acct.banned_until ? new Date(acct.banned_until).getTime() : 0;
      if (
        acct.deleted_at ||
        acct.is_anonymous ||
        (bannedUntil && bannedUntil > Date.now()) ||
        !(acct.email_confirmed_at ?? acct.confirmed_at)
      ) { skip("ineligible_account"); continue; }
      if (!testEmail && alreadySent.has(email)) { skip("already_sent_this_week"); continue; }

      // Activity filter: impressions this week OR a live widget heartbeat this week.
      let active = userStartups.some((s) =>
        (impCount.get(s.id) ?? 0) > 0 || (s.hb && new Date(s.hb).getTime() >= activeSince)
      );
      // A server-confirmed signup is activity even without a recent bar heartbeat.
      if (!active) {
        const { count, error: conversionActivityError } = await admin.from('signup_conversions').select('id',{count:'exact',head:true}).in('startup_id',userStartups.map(s=>s.id)).eq('is_test',false).gte('created_at',sevenDaysAgo).limit(1);
        if (!conversionActivityError) active = (count ?? 0)>0;
      }
      if (!active) { skip("inactive"); continue; }

      candidates.push({ userId, email, user, startups: userStartups });
    }

    // Oldest-served first so everyone rotates fairly across days.
    candidates.sort((a, b) =>
      (lastSentAt.get(a.email) ?? 0) - (lastSentAt.get(b.email) ?? 0) || a.email.localeCompare(b.email)
    );
    const batch = candidates.slice(0, testEmail ? 1 : DAILY_CAP);
    const remaining = candidates.length - batch.length;

    for (const { userId, email, user, startups: userStartups } of batch) {
      let logId: string | null = null;
      try {
        // Claim the send first; a concurrent run will see this pending row.
        const { data: claim, error: claimError } = await admin.rpc('claim_weekly_digest', { _email: email, _test: !!testEmail });
        if (claimError) throw claimError;
        logId = (claim as string) ?? null;
        if (!logId) { skip('already_claimed_or_daily_cap'); continue; }


        const sections: string[] = [];
        const firstVerifiedIds: string[] = [];
        for (const s of userStartups) {
          const impressions = impCount.get(s.id) ?? 0;

          // Daily rollups keep the digest fast; raw event scans time out.
          const { data: rows } = await admin
            .from("startup_stats_daily")
            .select("date, impressions_received, clicks_received")
            .eq("startup_id", s.id)
            .gte("date", fourteenDaysAgo.slice(0, 10));
          const cut = sevenDaysAgo.slice(0, 10);
          let clicks = 0, lastWeekImps = 0;
          for (const r of rows ?? []) {
            if (r.date >= cut) clicks += Number(r.clicks_received) || 0;
            else lastWeekImps += Number(r.impressions_received) || 0;
          }

          const rank = [...impCount.values()].filter((c) => c > impressions).length + 1;
          const ctr = impressions > 0 ? ((clicks ?? 0) / impressions * 100).toFixed(1) : "0.0";

          const lw = lastWeekImps ?? 0;
          const diff = impressions - lw;
          let delta: string;
          if (diff > 0) { delta = `${diff.toLocaleString("en-US")} more`; }
          else if (diff < 0) { delta = `${Math.abs(diff).toLocaleString("en-US")} fewer`; }
          else { delta = "No change in"; }

          // Optional reporting is isolated: a reporting outage never invents zeros.
          const { data: signupSummary, error: signupError } = await admin.rpc('digest_signup_summary', { _startup_id: s.id, _since: sevenDaysAgo, _until: now.toISOString() });
          const signupTracking = signupError ? null : signupSummary as { enabled: boolean; verified: number; reported: number } | null;
          if (signupTracking?.verified && !testEmail) {
            const { data: tracking } = await admin.from('signup_tracking_settings').select('first_verified_email_at').eq('startup_id',s.id).maybeSingle();
            if (tracking && !tracking.first_verified_email_at) firstVerifiedIds.push(s.id);
          }

          sections.push(section({
            startupName: s.name,
            websiteUrl: s.websiteUrl,
            logoUrl: s.logoUrl,
            impressions,
            clicks: clicks ?? 0,
            ctr,
            rank: `#${rank}`,
            impressionsDelta: delta,
            signupTracking,
          }));
        }

        const fullName = (user.user_metadata?.full_name as string) || user.email.split("@")[0];
        const firstName = fullName.split(" ")[0] || "Founder";
        const intro = userStartups.length === 1
          ? `Here's how ${escapeHtml(userStartups[0].name)} performed on the StartupBar network this week.`
          : `Here's how your ${userStartups.length} startups performed on the StartupBar network this week.`;

        const token = await getOrCreateUnsubToken(admin, email);
        const unsubUrl = `https://startupbar.co/u/${token}`;
        // Recheck suppression and account eligibility immediately before delivery.
        const { data: suppressionNow, error: suppressionNowError } = await admin.from('suppressed_emails').select('id').eq('email',email).maybeSingle();
        const { data: freshAuth, error: freshAuthError } = await admin.auth.admin.getUserById(userId);
        const freshUser = freshAuth?.user;
        if (suppressionNowError || freshAuthError) throw new Error('Recipient eligibility unavailable');
        if (suppressionNow || !freshUser?.email_confirmed_at || freshUser.is_anonymous || freshUser.deleted_at || (freshUser.banned_until && new Date(freshUser.banned_until).getTime()>Date.now())) {
          await admin.from('email_send_log').update({status:'skipped',error_message:'Recipient suppressed or ineligible at send time'}).eq('id',logId);
          skip('suppressed_or_ineligible_at_send'); continue;
        }
        const firstVerified = firstVerifiedIds.length>0;
        const html = shell(firstName, intro, sections.join("\n"), unsubUrl, firstVerified);
        // Keep an ambiguous delivery pending, so a network timeout cannot send
        // another email with a new provider idempotency key on the next run.
        let res: any;
        try { res = await sendEmail(email, html, unsubUrl, `weekly-digest/${logId}`, firstVerified); }
        catch (deliveryError) {
          await admin.from('email_send_log').update({error_message:'Delivery uncertain or rejected; held to prevent duplicate sends'}).eq('id',logId);
          errors.push({userId,error:'Delivery not confirmed; send held'});
          await new Promise(r=>setTimeout(r,600));
          continue;
        }
        if (logId) {
          await admin.from("email_send_log")
            .update({ status: "sent", message_id: (res as any)?.id ?? null })
            .eq("id", logId);
        }
        if (firstVerifiedIds.length>0) await admin.from('signup_tracking_settings').update({first_verified_email_at:new Date().toISOString()}).in('startup_id',firstVerifiedIds).is('first_verified_email_at',null);
        sent++;
      } catch (e) {
        console.error(`Failed for user ${userId}:`, e);
        errors.push({ userId, error: String(e) });
        if (logId) {
          await admin.from("email_send_log")
            .update({ status: "failed", error_message: String(e).slice(0, 300) })
            .eq("id", logId);
        }
      }
      // Pace well under Resend's rate limit.
      await new Promise((r) => setTimeout(r, 600));
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, skipReasons, remaining, errors }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
