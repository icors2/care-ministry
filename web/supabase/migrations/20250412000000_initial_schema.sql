-- Care Ministry: core schema, RLS, and helper functions
-- Run via Supabase SQL editor or supabase db push

-- -----------------------------------------------------------------------------
-- Profiles (care team + admin); one row per auth user
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text,
  phone_digits text,
  mms_gateway_domain text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Care team member or admin; MMS fields for email-to-SMS gateway.';

create index profiles_role_idx on public.profiles (role);

-- -----------------------------------------------------------------------------
-- Visit requests (from public intake or admin)
-- -----------------------------------------------------------------------------
create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  congregant_name text not null,
  address text not null,
  phone text not null,
  preferred_times_text text,
  prayer_requests text,
  special_instructions text,
  visit_window_start timestamptz,
  visit_window_end timestamptz,
  status text not null default 'new'
    check (status in ('new', 'pending_member', 'accepted', 'declined', 'completed', 'cancelled')),
  consent_contact boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column public.visit_requests.visit_window_start is 'Structured window for matching; admin may set from preferred_times_text.';

create index visit_requests_status_idx on public.visit_requests (status);
create index visit_requests_window_idx on public.visit_requests (visit_window_start, visit_window_end);

-- -----------------------------------------------------------------------------
-- Recurring weekly availability (member timezone + day + local time range)
-- -----------------------------------------------------------------------------
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

create index availability_blocks_user_idx on public.availability_blocks (user_id);

-- -----------------------------------------------------------------------------
-- Assignment of a member to a visit; cryptographic token for accept/deny links
-- -----------------------------------------------------------------------------
create table public.visit_assignments (
  id uuid primary key default gen_random_uuid(),
  visit_request_id uuid not null references public.visit_requests (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id) on delete cascade,
  response_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  notification_sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  post_visit_notes text,
  created_at timestamptz not null default now(),
  unique (visit_request_id, assignee_id)
);

create index visit_assignments_assignee_idx on public.visit_assignments (assignee_id);
create index visit_assignments_token_idx on public.visit_assignments (response_token);
create index visit_assignments_request_idx on public.visit_assignments (visit_request_id);

-- -----------------------------------------------------------------------------
-- Public intake rate limiting (hashed IP; no raw PII)
-- -----------------------------------------------------------------------------
create table public.intake_rate_log (
  id bigserial primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index intake_rate_log_lookup on public.intake_rate_log (ip_hash, created_at desc);

-- -----------------------------------------------------------------------------
-- Audit log for admin actions
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

-- -----------------------------------------------------------------------------
-- Auth: new users get a profile row (default member)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'member',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- updated_at touch
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS helpers
-- -----------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.visit_requests enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.visit_assignments enable row level security;
alter table public.intake_rate_log enable row level security;
alter table public.audit_log enable row level security;

-- profiles: read own or any admin; update own
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

-- visit_requests: full access for admin; read if user has any assignment to this request
create policy visit_requests_admin_all on public.visit_requests
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy visit_requests_select_assigned on public.visit_requests
  for select using (
    exists (
      select 1 from public.visit_assignments va
      where va.visit_request_id = visit_requests.id
        and va.assignee_id = auth.uid()
    )
  );

-- availability: own row or admin
create policy availability_select on public.availability_blocks
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy availability_insert_self on public.availability_blocks
  for insert with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy availability_update_self on public.availability_blocks
  for update using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy availability_delete_self on public.availability_blocks
  for delete using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- visit_assignments: admin all; assignee read own; assignee update notes on accepted
create policy visit_assignments_admin_all on public.visit_assignments
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy visit_assignments_assignee_select on public.visit_assignments
  for select using (assignee_id = auth.uid());

create policy visit_assignments_assignee_update_notes on public.visit_assignments
  for update
  using (assignee_id = auth.uid() and status = 'accepted')
  with check (assignee_id = auth.uid() and status = 'accepted');

-- intake_rate_log & audit_log: no client access (service role only)
-- RLS enabled with no policies = deny all for anon/authenticated via PostgREST

-- Promote first admin after signup (run once in SQL editor; replace email):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@church.org' limit 1);
