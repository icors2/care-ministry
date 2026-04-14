-- Soft-delete (archive) visit requests; hide from member open list when archived

alter table public.visit_requests
  add column if not exists deleted_at timestamptz;

comment on column public.visit_requests.deleted_at is 'When set, request is archived and hidden from volunteering / open lists.';

drop policy if exists visit_requests_select_open_for_members on public.visit_requests;

create policy visit_requests_select_open_for_members on public.visit_requests
  for select using (
    status = 'new'
    and deleted_at is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'member'
    )
  );
