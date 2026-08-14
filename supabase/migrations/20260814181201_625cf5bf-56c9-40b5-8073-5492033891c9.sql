create or replace function public.public_startup_profile_views(_startup_id uuid, _since timestamptz default null)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.impressions i
  join public.startups s on s.id = _startup_id
  where i.shown_startup_id = '0d2db708-f4e9-4b77-bd83-c446826c76b1'::uuid
    and s.slug is not null
    and (i.path = '/startup/' || s.slug or i.path like '/startup/' || s.slug || '?%')
    and (_since is null or i.created_at >= _since)
$$;

revoke all on function public.public_startup_profile_views(uuid, timestamptz) from public, anon;
grant execute on function public.public_startup_profile_views(uuid, timestamptz) to authenticated;
grant execute on function public.public_startup_profile_views(uuid, timestamptz) to service_role;