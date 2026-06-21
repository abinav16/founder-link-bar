import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FROM_PERSONAL = "Abinav from StartupBar <hello@startupbar.co>";
const FROM_NOREPLY = "StartupBar <noreply@startupbar.co>";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function logo() {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:0;">
    <tr>
      <td style="background:#000;border-radius:3px;width:22px;height:7px;display:inline-block;"></td>
      <td style="padding-left:8px;font-size:14px;font-weight:600;color:#000;letter-spacing:-0.3px;vertical-align:middle;">StartupBar</td>
    </tr>
  </table>`;
}

function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:12px 22px;border-radius:8px;letter-spacing:-0.1px;">${label} →</a>`;
}

function wrap(preheader: string, body: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f7f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f6;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
  <tr><td style="padding-bottom:20px;">${logo()}</td></tr>
  <tr><td style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:36px 40px 40px;">${body}</td></tr>
      <tr><td style="padding:18px 40px;border-top:1px solid rgba(0,0,0,0.06);background:#fafafa;">
        <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.3);line-height:1.6;">
          © ${new Date().getFullYear()} StartupBar &nbsp;·&nbsp;
          <a href="https://startupbar.co" style="color:rgba(0,0,0,0.3);text-decoration:none;">startupbar.co</a> &nbsp;·&nbsp;
          <a href="https://startupbar.co/privacy" style="color:rgba(0,0,0,0.3);text-decoration:none;">Privacy</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#000;line-height:1.2;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:0 0 12px;font-size:14px;color:rgba(0,0,0,0.65);line-height:1.65;">${text}</p>`;
}

function sig() {
  return `<p style="margin:28px 0 0;font-size:13px;color:rgba(0,0,0,0.4);">— Abinav from StartupBar</p>`;
}

function emailWelcome(name: string) {
  const first = name?.split(" ")[0] || "there";
  return {
    from: FROM_PERSONAL,
    subject: `Welcome to StartupBar, ${first}.`,
    html: wrap(
      "You're now part of the founder traffic exchange network.",
      h1("Welcome aboard.") +
      p(`Hi ${first},`) +
      p("You're now part of a growing network of founders helping each other get their first traffic — free, forever, no strings attached.") +
      p("The next step is to apply your startup. It takes about 2 minutes and one line of code.") +
      btn("Apply your startup", "https://startupbar.co/apply") +
      sig()
    ),
  };
}

function emailStartupSubmitted(name: string, startupName: string) {
  const first = name?.split(" ")[0] || "there";
  return {
    from: FROM_NOREPLY,
    subject: `Application received — ${startupName}`,
    html: wrap(
      "We'll review your application within 24 hours.",
      h1("Application received.") +
      p(`Hi ${first},`) +
      p(`We've received your application for <strong style="color:#000;">${startupName}</strong> and it's now in our review queue.`) +
      p("We review every application manually and aim to respond within 24 hours. We'll email you once a decision is made.") +
      btn("Check your dashboard", "https://startupbar.co/dashboard") +
      p(`<span style="font-size:12px;color:rgba(0,0,0,0.35);display:block;margin-top:20px;">Questions? Reply to hello@startupbar.co</span>`)
    ),
  };
}

function emailStartupApproved(name: string, startupName: string) {
  const first = name?.split(" ")[0] || "there";
  return {
    from: FROM_PERSONAL,
    subject: `${startupName} is now live on StartupBar 🎉`,
    html: wrap(
      "Your startup is approved and showing on the network.",
      h1("You're live. 🎉") +
      p(`Hi ${first},`) +
      p(`<strong style="color:#000;">${startupName}</strong> has been approved and is now showing across the StartupBar network. Other founders' sites are already discovering your startup.`) +
      p("To complete the exchange, install the embed script on your site — it takes one line of code and under a minute.") +
      btn("Get your embed script", "https://startupbar.co/dashboard") +
      sig()
    ),
  };
}

function emailStartupRejected(name: string, startupName: string) {
  const first = name?.split(" ")[0] || "there";
  return {
    from: FROM_PERSONAL,
    subject: `Update on your StartupBar application`,
    html: wrap(
      "We've reviewed your application.",
      h1("Application update.") +
      p(`Hi ${first},`) +
      p(`After reviewing <strong style="color:#000;">${startupName}</strong>, we're unable to approve it at this time.`) +
      p("Common reasons include: the website isn't publicly accessible, the content doesn't meet our community guidelines, or the listing is incomplete. You're welcome to make updates and reapply.") +
      btn("Update & reapply", "https://startupbar.co/apply") +
      p(`<span style="font-size:12px;color:rgba(0,0,0,0.35);display:block;margin-top:20px;">If you think this is a mistake, reply to hello@startupbar.co</span>`)
    ),
  };
}

function emailTest(toEmail: string) {
  return {
    from: FROM_PERSONAL,
    subject: "StartupBar emails are working ✓",
    html: wrap(
      "Test email from StartupBar.",
      h1("Email delivery confirmed.") +
      p("This is a test email to confirm that StartupBar's transactional email system is working correctly via Resend.") +
      p("All email types are configured:") +
      `<ul style="margin:12px 0;padding-left:20px;font-size:14px;color:rgba(0,0,0,0.65);line-height:1.8;">
        <li>Welcome email on signup</li>
        <li>Application received confirmation</li>
        <li>Startup approved notification</li>
        <li>Startup rejected notification</li>
      </ul>` +
      sig()
    ),
    to: toEmail,
  };
}

function emailAdminNewApplication(startupName: string, startupUrl: string, description: string, applicantEmail: string) {
  return {
    from: FROM_NOREPLY,
    to: "danielabinav16@gmail.com",
    subject: `New application — ${startupName}`,
    html: wrap(
      `${startupName} just applied to StartupBar.`,
      h1("New startup application.") +
      p(`<strong style="color:#000;">${startupName}</strong> just submitted an application and is waiting for your review.`) +
      `<table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border:1px solid rgba(0,0,0,0.07);border-radius:8px;overflow:hidden;">
        <tr style="background:#fafafa;border-bottom:1px solid rgba(0,0,0,0.06);">
          <td style="padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(0,0,0,0.35);width:120px;">Name</td>
          <td style="padding:10px 16px;font-size:13px;color:#000;">${startupName}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(0,0,0,0.06);">
          <td style="padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(0,0,0,0.35);">URL</td>
          <td style="padding:10px 16px;font-size:13px;"><a href="${startupUrl}" style="color:#000;">${startupUrl}</a></td>
        </tr>
        <tr style="border-bottom:1px solid rgba(0,0,0,0.06);">
          <td style="padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(0,0,0,0.35);">One-liner</td>
          <td style="padding:10px 16px;font-size:13px;color:rgba(0,0,0,0.65);">${description}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(0,0,0,0.35);">Applicant</td>
          <td style="padding:10px 16px;font-size:13px;color:rgba(0,0,0,0.65);">${applicantEmail}</td>
        </tr>
      </table>` +
      btn("Review in admin panel", "https://startupbar.co/admin")
    ),
  };
}

async function sendViaResend(payload: { from: string; to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { type, data } = await req.json();
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let email: { from: string; subject: string; html: string; to?: string };
    let toEmail: string;

    if (type === "test") {
      const payload = emailTest(data.to);
      await sendViaResend({ from: payload.from, to: payload.to!, subject: payload.subject, html: payload.html });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (type === "welcome") {
      toEmail = data.email;
      email = emailWelcome(data.name);
    } else if (type === "startup-submitted") {
      toEmail = data.email;
      email = emailStartupSubmitted(data.name, data.startupName);
    } else if (type === "startup-approved" || type === "startup-rejected") {
      const { data: startup } = await adminClient.from("startups").select("name, user_id").eq("id", data.startupId).single();
      if (!startup) throw new Error("Startup not found");
      const { data: { user } } = await adminClient.auth.admin.getUserById(startup.user_id);
      if (!user) throw new Error("User not found");
      toEmail = user.email!;
      const userName = user.user_metadata?.full_name || user.email!.split("@")[0];
      email = type === "startup-approved"
        ? emailStartupApproved(userName, startup.name)
        : emailStartupRejected(userName, startup.name);
    } else {
      throw new Error(`Unknown type: ${type}`);
    }

    await sendViaResend({ from: email.from, to: toEmail, subject: email.subject, html: email.html });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
