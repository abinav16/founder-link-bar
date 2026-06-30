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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let subject = "";
    let html = "";
    let to: string | string[] = "";

    // ---- Admin notification: no startup row lookup, sends to admin only ----
    if (type === "admin-new-application") {
      const startupName: string = data?.startupName ?? "Unknown";
      const startupUrl: string = data?.startupUrl ?? "";
      const description: string = data?.description ?? "";
      const applicantEmail: string = data?.applicantEmail ?? "unknown";

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
            <p style="margin:0 0 14px 0;font-size:14px;"><a href="${startupUrl}" style="color:#0a0a0a;">${startupUrl}</a></p>
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
    if (type === "startup-submitted") {
      const email: string = data?.email;
      const founderName = ((data?.name as string | undefined) ?? "").split(" ")[0] || "Founder";
      const startupName: string = data?.startupName ?? "your startup";
      if (!email) return new Response("No email", { status: 400, headers: corsHeaders });

      to = email;
      subject = `We received your StartupBar application — ${startupName}`;
      html = shell({
        heading: "Application received ✓",
        bodyHtml: `
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

      const REASONS: Record<string, { subject: string; heading: string; body: string }> = {
        not_allowed_type: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Your site type isn't a fit",
          body: `
            ${p(`Hi ${founderName},`)}
            ${p(`Thanks for applying to StartupBar. After reviewing ${strong(name)}, we're unable to approve it because the site type doesn't fit the kind of products we feature on the network.`)}
            ${p(`StartupBar is built for live SaaS, indie products and founder-led startups. Directories, affiliate sites, adult content, gambling, scrapers and link-farms aren't allowed.`)}
            ${p(`If you're building something else under the same brand, you're welcome to reapply with that project.`)}
          `,
        },
        widget_hidden: {
          subject: `Action needed: StartupBar widget is hidden on ${site}`,
          heading: "Widget is installed but hidden",
          body: `
            ${p(`Hi ${founderName},`)}
            ${p(`We found the StartupBar script on ${strong(site)} — but the widget bar is being hidden (CSS display:none, visibility:hidden, 0-height wrapper, or a parent element clipping it).`)}
            ${p(`The network only works when every member shows the bar to their visitors. Hiding it breaks the mutual-exchange that gives every startup free traffic — so we can't approve ${strong(name)} while it's hidden.`)}
            ${p(`Remove the CSS that hides the iframe, then reapply at <a href="https://startupbar.co/apply" style="color:#0a0a0a;">startupbar.co/apply</a> and we'll take another look right away.`)}
          `,
        },
        widget_not_installed: {
          subject: `${name} — StartupBar widget not installed`,
          heading: "Widget snippet not found",
          body: `
            ${p(`Hi ${founderName},`)}
            ${p(`We couldn't find the StartupBar embed script on ${strong(site)}. Every startup on the network needs the widget live before it can be approved.`)}
            ${p(`Add the snippet from your <a href="https://startupbar.co/dashboard" style="color:#0a0a0a;">dashboard</a> into the ${strong("&lt;head&gt;")} of your site, then reapply — approval usually happens within a few hours.`)}
          `,
        },
        low_quality: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Site isn't ready yet",
          body: `
            ${p(`Hi ${founderName},`)}
            ${p(`Thanks for applying. After reviewing ${strong(name)}, the site doesn't quite meet the bar for the network yet — most often that's placeholder content, a broken landing page, missing product information, or a "coming soon" page.`)}
            ${p(`Once the site has a working product page with a clear value proposition, you're very welcome to reapply.`)}
          `,
        },
        duplicate: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Duplicate submission",
          body: `
            ${p(`Hi ${founderName},`)}
            ${p(`${strong(name)} (or another submission for ${strong(site)}) is already in our system, so we've closed this duplicate application.`)}
            ${p(`If you're locked out of the original account, just reply to this email and we'll help you regain access.`)}
          `,
        },
        broken_site: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "We couldn't load your site",
          body: `
            ${p(`Hi ${founderName},`)}
            ${p(`We tried to review ${strong(name)} but ${strong(site)} wouldn't load — it returned an error, timed out, or wasn't reachable from our servers.`)}
            ${p(`Once the site is back up and serving normally, please reapply at <a href="https://startupbar.co/apply" style="color:#0a0a0a;">startupbar.co/apply</a>.`)}
          `,
        },
        generic: {
          subject: `Update on your StartupBar application — ${name}`,
          heading: "Update on your application",
          body: `
            ${p(`Hi ${founderName},`)}
            ${p(`Thank you for applying to StartupBar. After reviewing ${strong(name)}, we're unable to approve it at this time.`)}
            ${p(`If you think this was a mistake or would like to reapply with changes, just reply to this email and we'll take another look.`)}
          `,
        },
      };

      const r = REASONS[reason] ?? REASONS.generic;
      const noteBlock = customNote
        ? `<div style="margin:0 0 16px 0;border-left:3px solid #0a0a0a;background:#fafafa;padding:12px 14px;border-radius:6px;font-size:14px;line-height:1.6;color:#27272a;">${customNote.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>`
        : "";
      subject = r.subject;
      html = shell({ heading: r.heading, bodyHtml: r.body + noteBlock });
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
