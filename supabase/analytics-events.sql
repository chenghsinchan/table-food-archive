-- =============================================================================
-- TABLE — lightweight, privacy-first analytics
--
-- One append-only table of product events. Properties may only ever contain
-- IDs or small anonymous metadata (counts, enums) — never titles, notes,
-- ingredients, photos, or locations. That rule is enforced in the app code
-- (lib/analytics/track.ts), not by the database.
--
-- Visibility is founder-only: any signed-in user may record their own
-- events, but only chenghsinchan@gmail.com may read them back. There is no
-- update or delete policy — events are immutable once written.
--
-- Safe + additive. Never touches food_entries, groups, or any existing
-- table. Safe to run more than once. Run the whole file in the Supabase
-- SQL Editor.
-- =============================================================================

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Keep the allowed event names in one place. Adding a new event later means
-- adding it to this list and re-running just these two statements.
alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check
  check (event_name in (
    'app_opened',
    'dish_added',
    'dish_updated',
    'dish_deleted',
    'meal_planned',
    'shopping_list_generated',
    'dish_marked_recreate',
    'invite_sent',
    'group_created'
  ));

create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events(event_name);
create index if not exists analytics_events_user_idx on public.analytics_events(user_id);

-- Founder-only read check (SECURITY DEFINER avoids row-level-security
-- recursion, same pattern as is_group_member / shares_group_with).
create or replace function public.is_app_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'chenghsinchan@gmail.com';
$$;

alter table public.analytics_events enable row level security;

-- Any signed-in user may record their own events. No one may record an
-- event on someone else's behalf.
drop policy if exists "Record own events" on public.analytics_events;
create policy "Record own events"
on public.analytics_events for insert
to authenticated
with check (user_id = auth.uid());

-- Only the founder may read events back. Regular users cannot see anyone's
-- activity, including their own — this is an internal dashboard, not a
-- user-facing feature.
drop policy if exists "Founder reads all events" on public.analytics_events;
create policy "Founder reads all events"
on public.analytics_events for select
to authenticated
using (public.is_app_owner());

-- No update/delete policy: events are append-only. (Row Level Security
-- defaults to denying an action when no policy grants it.)

-- Check: should list the analytics_events columns.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'analytics_events'
order by ordinal_position;
