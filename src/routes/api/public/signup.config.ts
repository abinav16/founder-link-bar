import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const Route = createFileRoute('/api/public/signup/config')({
  server: { handlers: {
    GET: async ({ request }) => {
      const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get('id'));
      const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
      if (!id.success) return Response.json({ enabled: false }, { status: 400, headers });
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      const url = process.env.SUPABASE_URL;
      if (!key || !url) return Response.json({ enabled: false }, { status: 503, headers });
      const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers); h.set('apikey',key); if(key.startsWith('sb_')) h.delete('Authorization'); return fetch(input,{...init,headers:h});}}});
      const { data,error } = await client.rpc('signup_tracking_public',{_startup_id:id.data});
      return Response.json(error ? { enabled: false } : data ?? { enabled: false }, { status: error ? 503 : 200, headers });
    },
  } },
});