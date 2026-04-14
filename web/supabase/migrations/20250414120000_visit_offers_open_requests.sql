-- Volunteer offers for open visit requests + members can read open "new" requests for calendar

create table public.visit_offers (
  id uuid primary key default gen_random_uuid(),
  visit_request_id uuid not null references public.visit_requests (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (visit_request_id, member_id)
);

create index visit_offers_request_idx on public.visit_offers (visit_request_id);
create index visit_offers_member_idx on public.visit_offers (member_id);

alter table public.visit_offers enable row level security;

create policy visit_offers_admin_all on public.visit_offers
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy visit_offers_select_own_or_admin on public.visit_offers
  for select using (member_id = auth.uid() or public.is_admin(auth.uid()));

create policy visit_offers_insert_self on public.visit_offers
  for insert with check (member_id = auth.uid());

create policy visit_offers_delete_self on public.visit_offers
  for delete using (member_id = auth.uid());

-- Members (care team) may list open requests for volunteering / calendar
create policy visit_requests_select_open_for_members on public.visit_requests
  for select using (
    status = 'new'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'member'
    )
  );
