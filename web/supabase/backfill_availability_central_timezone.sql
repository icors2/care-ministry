-- One-off: run in Supabase SQL editor if older rows used a different timezone.
update public.availability_blocks
set timezone = 'America/Chicago'
where timezone is distinct from 'America/Chicago';
