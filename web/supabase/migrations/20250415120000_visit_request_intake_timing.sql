-- Intake timing mode, recurring flag, and multiple specific windows (JSON)

alter table public.visit_requests
  add column if not exists visit_timing_recurring boolean not null default true,
  add column if not exists intake_timing_mode text
    check (intake_timing_mode is null or intake_timing_mode in ('preferred_slots', 'specific_windows')),
  add column if not exists intake_visit_windows jsonb;

comment on column public.visit_requests.visit_timing_recurring is 'If false, preferred-slot matching uses a short (one-week) lookahead.';
comment on column public.visit_requests.intake_timing_mode is 'How timing was submitted: recurring day slots vs explicit windows.';
comment on column public.visit_requests.intake_visit_windows is 'Array of {start,end} ISO strings when intake used specific windows.';
