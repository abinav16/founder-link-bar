import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { normalizeSuccessPath, randomReferralToken, sha256, type SignupSummary } from './signup-tracking';

const idInput = z.object({ startupId: z.string().uuid() });

export const getSignupSummary = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.extend({ since: z.string().datetime().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc('my_signup_summary', { _startup_id: data.startupId, _since: data.since ?? undefined });
    if (result.error) throw new Error('Signup reporting is unavailable. Your traffic statistics are unaffected.');
    return result.data as unknown as SignupSummary;
  });

export const saveSignupTracking = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.extend({ enabled: z.boolean(), successPath: z.string().max(200), consentAcknowledged: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: owned, error } = await context.supabase.rpc('get_my_startups');
    if (error || !(owned ?? []).some(s => s.id === data.startupId)) throw new Error('You can only configure your own startup.');
    if (data.enabled && !data.consentAcknowledged) throw new Error('Confirm the privacy and signup-complete requirements first.');
    const path = data.successPath.trim() ? normalizeSuccessPath(data.successPath) : null;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('signup_tracking_settings').upsert({ startup_id: data.startupId, enabled: data.enabled, success_path: path, configured_at: new Date().toISOString() });
    if (result.error) throw new Error('Could not save signup tracking. Please try again.');
    return { ok: true };
  });

export const rotateSignupKey = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: owned, error: ownershipError } = await context.supabase.rpc('get_my_startups');
    if (ownershipError) throw new Error('Could not verify startup ownership. Please try again.');
    if (!(owned ?? []).some(s => s.id === data.startupId)) throw new Error('Forbidden');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const secret = randomReferralToken();
    const { error } = await supabaseAdmin.from('signup_tracking_keys').upsert({ startup_id: data.startupId, secret, rotated_at: new Date().toISOString() });
    if (error) throw new Error('Could not create a signing key.');
    return { secret };
  });

export const createSignupTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: owned, error: ownershipError } = await context.supabase.rpc('get_my_startups');
    if (ownershipError) throw new Error('Could not verify startup ownership. Please try again.');
    const startup = (owned ?? []).find(s => s.id === data.startupId);
    if (!startup) throw new Error('Forbidden');
    if (startup.status !== 'approved' || startup.banned) throw new Error('Test tracking after your startup is approved.');
    const { data: config, error: configError } = await context.supabase.from('signup_tracking_settings').select('enabled,success_path').eq('startup_id',data.startupId).maybeSingle();
    if (configError || !config?.enabled) throw new Error('Save and enable tracking first.');
    const destination = new URL(startup.website_url);
    const token = randomReferralToken();
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('signup_referrals').insert({ startup_id: data.startupId, token_hash: await sha256(token), is_test: true });
    if (error) throw new Error('Could not create a test referral.');
    destination.searchParams.set('_sbref',token);
    destination.searchParams.set('utm_source','startupbar');
    return { url: destination.href };
  });