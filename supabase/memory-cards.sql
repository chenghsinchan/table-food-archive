-- =============================================================================
-- TABLE — Memory cards: entries as occasions, dishes as reusable records
--
-- The one migration for the flip-card redesign. Adds, all optional:
--   * dishes table + food_entries.dish_id — a dish is reusable (name,
--     ingredients, method, effort); an entry happened once. Existing entries
--     are backfilled: one dish per archive/title pair, entries linked to it.
--   * mood           one of six feelings; colors the card back and accents
--   * atmosphere_x   0–100, drained (0) → energised (100)
--   * atmosphere_y   0–100, vivid (0) → soothing (100)
--   * weather        compact editable string, e.g. "11°C · Rain · Evening"
--   * place_label    lived place, e.g. "At home · Angel"
--   * effort         easy | moderate | involved
--   * entry_time / daypart / temperature_c  quiet context columns
--
-- Safe + additive: deletes nothing, changes no existing policies. Existing
-- photos, notes, tags, LOVE data and plans are untouched. Idempotent — safe
-- to run more than once. Run the whole file in the Supabase SQL Editor.
-- (Supersedes the earlier draft entry-dish-atmosphere.sql; if you already ran
-- that draft, this file upgrades it in place and the unused
-- atmosphere_energy/atmosphere_tone columns simply remain empty.)
-- =============================================================================

-- 1) Reusable dishes
create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  name text not null,
  ingredients text,
  method text,
  effort text check (effort in ('easy', 'moderate', 'involved')),
  cook_time_minutes integer check (cook_time_minutes > 0 and cook_time_minutes <= 1440),
  tags text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If the earlier draft created dishes with the old effort words, relax to the
-- final vocabulary (easy/moderate/involved).
alter table public.dishes drop constraint if exists dishes_effort_check;
alter table public.dishes
  add constraint dishes_effort_check
  check (effort is null or effort in ('easy', 'moderate', 'involved'));

-- 2) Entry columns
alter table public.food_entries add column if not exists dish_id uuid references public.dishes(id) on delete set null;
alter table public.food_entries add column if not exists entry_time time;
alter table public.food_entries add column if not exists daypart text check (daypart in ('morning', 'afternoon', 'evening', 'night'));
alter table public.food_entries add column if not exists temperature_c smallint;
alter table public.food_entries add column if not exists weather text;
alter table public.food_entries add column if not exists place_label text;
alter table public.food_entries add column if not exists mood text
  check (mood in ('cozy', 'comfort', 'fresh', 'calm', 'sweet', 'indulgent'));
alter table public.food_entries add column if not exists atmosphere_x real
  check (atmosphere_x >= 0 and atmosphere_x <= 100);
alter table public.food_entries add column if not exists atmosphere_y real
  check (atmosphere_y >= 0 and atmosphere_y <= 100);
alter table public.food_entries add column if not exists effort text
  check (effort in ('easy', 'moderate', 'involved'));

create index if not exists dishes_group_id_idx on public.dishes(group_id);
create unique index if not exists dishes_group_name_unique_idx on public.dishes(group_id, lower(trim(name)));
create index if not exists food_entries_dish_id_idx on public.food_entries(dish_id);

-- 3) Dish privacy: archive members only (same model as food_entries)
alter table public.dishes enable row level security;

drop policy if exists "Archive members can read dishes" on public.dishes;
create policy "Archive members can read dishes"
on public.dishes for select to authenticated
using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Archive members can create dishes" on public.dishes;
create policy "Archive members can create dishes"
on public.dishes for insert to authenticated
with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Archive members can update dishes" on public.dishes;
create policy "Archive members can update dishes"
on public.dishes for update to authenticated
using (public.is_group_member(group_id, auth.uid()))
with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Archive members can delete dishes" on public.dishes;
create policy "Archive members can delete dishes"
on public.dishes for delete to authenticated
using (public.is_group_member(group_id, auth.uid()));

-- 4) Backfill: one reusable dish per archive/title pair, entries linked.
--    Never changes photos, notes, or any existing entry field except dish_id.
insert into public.dishes (group_id, name, ingredients, method, cook_time_minutes, created_by)
select distinct on (group_id, lower(trim(title)))
  group_id, trim(title), ingredients, recipe, cook_time_minutes, created_by
from public.food_entries
where group_id is not null
order by group_id, lower(trim(title)), entry_date asc
on conflict do nothing;

update public.food_entries entry
set dish_id = dish.id
from public.dishes dish
where entry.dish_id is null
  and entry.group_id = dish.group_id
  and lower(trim(entry.title)) = lower(trim(dish.name));

-- 5) Check: the new entry columns should all be listed.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'food_entries'
  and column_name in ('dish_id', 'mood', 'atmosphere_x', 'atmosphere_y', 'weather', 'place_label', 'effort', 'daypart', 'entry_time', 'temperature_c')
order by column_name;
