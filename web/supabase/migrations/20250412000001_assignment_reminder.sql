-- Optional 24h reminder tracking for accepted assignments
alter table public.visit_assignments
  add column if not exists reminder_sent_at timestamptz;

comment on column public.visit_assignments.reminder_sent_at is 'Set when a pre-visit reminder was sent (cron).';
