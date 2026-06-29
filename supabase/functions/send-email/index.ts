import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM = "StartupBar <hello@startupbar.co>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(await res.text());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { type, data } = await req.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  let subject = "";
  let html = "";

  if (type === "startup-approved") {
    subject = `🎉 ${name} is now live on StartupBar`;
    html = `
      <p>Hi ${founderName},</p>
      <p>Great news — <strong>${name}</strong> has been approved and is now live on the StartupBar network.</p>
      <p>Your startup is being shown to thousands of founders across member sites. Make sure your widget is installed and visible so you appear on their bars too.</p>
      <p>Welcome to the network!</p>
      <p>— The StartupBar Team</p>
    `;
  } else if (type === "startup-rejected") {
    subject = `Update on your StartupBar application — ${name}`;
    html = `
      <p>Hi ${founderName},</p>
      <p>Thank you for applying to StartupBar. After reviewing <strong>${name}</strong>, we're unable to approve it at this time.</p>
      <p>If you think this was a mistake or would like to reapply, feel free to reach out.</p>
      <p>— The StartupBar Team</p>
    `;
  } else if (type === "startup-warning") {
    subject = `⚠️ Action required: StartupBar widget not detected on ${site}`;
    html = `
      <p>Hi ${founderName},</p>
      <p>We noticed that the StartupBar widget is no longer detected on <strong>${site}</strong>.</p>
      <p>Please reinstall the widget snippet within <strong>48 hours</strong> to stay in the network. If the widget is not detected after this period, your startup will be automatically removed.</p>
      <p>The snippet to add to your site:</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:6px;font-size:13px;">&lt;script src="https://startupbar.dev/widget.js" async&gt;&lt;/script&gt;</pre>
      <p>If you've already reinstalled it, no action is needed — we'll verify it shortly.</p>
      <p>— The StartupBar Team</p>
    `;
  } else if (type === "startup-removed-no-widget") {
    subject = `${name} has been removed from StartupBar`;
    html = `
      <p>Hi ${founderName},</p>
      <p>We're writing to let you know that <strong>${name}</strong> has been removed from the StartupBar network.</p>
      <p><strong>Reason:</strong> The StartupBar widget was not detected on <strong>${site}</strong> after the 48-hour grace period we issued.</p>
      <p>All startups in the network are required to keep the widget installed and visible — it's what makes the mutual discovery network work for everyone.</p>
      <p>If you reinstall the widget and would like to rejoin, you're welcome to reapply at <a href="https://startupbar.dev/apply">startupbar.dev/apply</a>.</p>
      <p>— The StartupBar Team</p>
    `;
  } else {
    return new Response("Unknown email type", { status: 400, headers: corsHeaders });
  }

  await sendEmail(email, subject, html);
  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
