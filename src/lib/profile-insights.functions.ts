import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { VouchTag } from './profile-insights';

export const getVouchAccess = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: access, error } = await context.supabase.rpc('profile_vouch_access', { _startup_id: data.id });
    if (error) throw new Error('Could not check founder eligibility. Please try again.');
    return access as unknown as { eligible: boolean; tag: VouchTag | null };
  });
export const saveVouch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; tag: VouchTag | null }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('set_startup_vouch', { _startup_id: data.id, _tag: data.tag as string });
    if (error) throw new Error('An approved founder account is required. You cannot vouch for your own startup.');
    return { ok: true };
  });