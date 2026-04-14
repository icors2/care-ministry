-- How often each availability window repeats (for matching + display)

alter table public.availability_blocks
  add column if not exists recurrence text not null default 'weekly'
    check (recurrence in ('weekly', 'biweekly', 'monthly'));

comment on column public.availability_blocks.recurrence is
  'weekly: every week; biweekly: every other week from created_at; monthly: first occurrence of that weekday each month';
