import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { TOKEN_PATTERN, matchesPartnerOrigin, normalizeSuccessPath, sha256, verifySignupSignature } from '@/lib/signup-tracking';
import { isBotRequest } from '@/lib/bot-filter';

const payloadSchema = z.object({ startup_id: z.string().uuid(), referral_token: z.string().regex(TOKEN_PATTERN), event_id: z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(), success_path: z.string().max(200).optional(), consent_granted: z.literal(true).optional() }).strict();
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', 'Vary': 'Origin' };

export const Route = createFileRoute('/api/public/signup/confirm')({ server: { handlers: {
  OPTIONS: () => new Response(null,{status:204,headers:cors}),
  POST: async ({ request }) => {
    try {
      if (Number(request.headers.get('content-length') ?? 0)>2048) return Response.json({accepted:false},{status:413,headers:cors});
      const raw = await request.text();
      if (raw.length>2048) return Response.json({accepted:false},{status:413,headers:cors});
      let json: unknown; try { json=JSON.parse(raw); } catch { return Response.json({accepted:false},{status:400,headers:cors}); }
      const parsed=payloadSchema.safeParse(json);
      if (!parsed.success) return Response.json({accepted:false},{status:400,headers:cors});
      const p=parsed.data;
      const signature=request.headers.get('x-startupbar-signature');
      const timestamp=request.headers.get('x-startupbar-timestamp') ?? '';
      const origin=request.headers.get('origin');
      if (!signature && (!origin || isBotRequest(request))) return Response.json({accepted:false},{status:403,headers:cors});
      // An unguessable referral token is the browser capability; only its hash is stored.
      const { supabaseAdmin }=await import('@/integrations/supabase/client.server');
      const tokenHash=await sha256(p.referral_token);
      const {data:referral,error:referralError}=await supabaseAdmin.from('signup_referrals').select('startup_id,expires_at').eq('token_hash',tokenHash).eq('startup_id',p.startup_id).maybeSingle();
      if (referralError) return Response.json({accepted:false,retry:true},{status:503,headers:cors});
      if (!referral || new Date(referral.expires_at).getTime()<Date.now()) return Response.json({accepted:false},{status:410,headers:cors});
      const [{data:startup},{data:settings}]=await Promise.all([
        supabaseAdmin.from('startups').select('website_url,status,banned').eq('id',p.startup_id).maybeSingle(),
        supabaseAdmin.from('signup_tracking_settings').select('enabled,success_path').eq('startup_id',p.startup_id).maybeSingle(),
      ]);
      if (!startup || startup.status!=='approved' || startup.banned || !settings?.enabled) return Response.json({accepted:false},{status:403,headers:cors});
      let confirmation: 'browser'|'server'='browser';
      if (signature) {
        const {data:key}=await supabaseAdmin.from('signup_tracking_keys').select('secret').eq('startup_id',p.startup_id).maybeSingle();
        if (!p.event_id || !key || !(await verifySignupSignature(key.secret,timestamp,raw,signature))) return Response.json({accepted:false},{status:401,headers:cors});
        confirmation='server';
      } else {
        if (!p.consent_granted || !origin || !matchesPartnerOrigin(origin,startup.website_url) || !settings.success_path || !p.success_path || normalizeSuccessPath(p.success_path)!==settings.success_path) return Response.json({accepted:false},{status:403,headers:cors});
      }
      const {data:result,error}=await supabaseAdmin.rpc('record_signup_conversion',{_token_hash:tokenHash,_startup_id:p.startup_id,_confirmation:confirmation,_event_hash:p.event_id && confirmation==='server' ? await sha256(`${p.startup_id}:${p.event_id}`) : undefined});
      if (error) return Response.json({accepted:false,retry:true},{status:503,headers:cors});
      return Response.json(result,{headers:cors});
    } catch { return Response.json({accepted:false},{status:400,headers:cors}); }
  },
} } });