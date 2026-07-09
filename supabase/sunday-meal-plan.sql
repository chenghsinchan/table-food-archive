-- =============================================================================
-- TABLE — SUNDAY weekly meal planner
--
-- Adds:
--   * food_entries.ingredients  (text, one ingredient per line, editable;
--     an AI photo-detection step can fill this in later)
--   * meal_plan_items            (dishes planned onto days of a week)
--
-- Safe + additive. Never deletes entries, photos, tags, LOVE data, or groups.
-- Safe to run more than once. Run the whole file in the Supabase SQL Editor.
-- =============================================================================

-- 1) Ingredients live on the food card itself
alter table public.food_entries
  add column if not exists ingredients text;

-- 2) The plan: one row = one dish placed on one day of one week
create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  food_entry_id uuid not null references public.food_entries(id) on delete cascade,
  week_start date not null,                -- the Monday of the planned week
  day_of_week integer not null check (day_of_week between 0 and 6),  -- 0 = Monday
  meal_slot text not null default 'dinner' check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  portions integer not null default 2 check (portions between 1 and 12),
  is_leftover boolean not null default false,
  position integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- If the table was created by an earlier version of this file, add the slot column.
alter table public.meal_plan_items
  add column if not exists meal_slot text not null default 'dinner'
  check (meal_slot in ('breakfast', 'lunch', 'dinner'));

create index if not exists meal_plan_items_group_week_idx
  on public.meal_plan_items(group_id, week_start);

-- 3) Privacy: only members of the group can see or change its meal plan
alter table public.meal_plan_items enable row level security;

drop policy if exists "Members read meal plan" on public.meal_plan_items;
create policy "Members read meal plan"
on public.meal_plan_items for select to authenticated
using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Members add to meal plan" on public.meal_plan_items;
create policy "Members add to meal plan"
on public.meal_plan_items for insert to authenticated
with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Members update meal plan" on public.meal_plan_items;
create policy "Members update meal plan"
on public.meal_plan_items for update to authenticated
using (public.is_group_member(group_id, auth.uid()))
with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Members remove from meal plan" on public.meal_plan_items;
create policy "Members remove from meal plan"
on public.meal_plan_items for delete to authenticated
using (public.is_group_member(group_id, auth.uid()));

-- 4) Check: should list the meal_plan_items columns
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'meal_plan_items'
order by ordinal_position;
