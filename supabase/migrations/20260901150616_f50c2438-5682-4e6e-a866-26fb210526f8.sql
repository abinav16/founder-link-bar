create table public.saved_startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  startup_id uuid references public.startups(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, startup_id)
);

grant select, insert, delete on public.saved_startups to authenticated;
grant all on public.saved_startups to service_role;

alter table public.saved_startups enable row level security;

create policy "Users can view their own saved startups"
  on public.saved_startups
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can save startups"
  on public.saved_startups
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can unsave startups"
  on public.saved_startups
  for delete
  to authenticated
  using (user_id = auth.uid());