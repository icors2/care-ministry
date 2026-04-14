-- Shared care team message board (dashboard users only)

create table public.team_board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint team_board_posts_body_len check (
    char_length(btrim(body)) >= 1
    and char_length(body) <= 4000
  )
);

comment on table public.team_board_posts is 'Short posts visible to all signed-in care team (dashboard).';

create index team_board_posts_created_at_idx on public.team_board_posts (created_at desc);

alter table public.team_board_posts enable row level security;

create policy team_board_posts_select_care_team on public.team_board_posts
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

create policy team_board_posts_insert_self on public.team_board_posts
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid())
  );

create policy team_board_posts_delete_own_or_admin on public.team_board_posts
  for delete using (
    author_id = auth.uid()
    or public.is_admin(auth.uid())
  );
