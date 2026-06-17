-- TABLE — ensure LOVE (save-to-Love) works on the live database.
--
-- Safe to run any number of times. It only ADDS the things LOVE needs:
--   * the food_entries.is_loved column
--   * the row-level-security UPDATE policies that let saving toggle is_loved
--
-- It does NOT delete data, reset tables, or drop any food entries.
-- Paste this whole file into the Supabase SQL Editor and click Run.

-- 1) Make sure the column LOVE relies on exists.
alter table public.food_entries
  add column if not exists is_loved boolean default false;

-- 2) Make sure logged-in users are allowed to update entries (this is what
--    flips is_loved to true when you save from TONIGHT). Re-creating the
--    policy is harmless if it already exists.
drop policy if exists "Authenticated users can update entries" on public.food_entries;
create policy "Authenticated users can update entries"
on public.food_entries for update
to authenticated
using (true)
with check (true);

-- 3) Same allowance for the public/anon archive role, to match the rest of the schema.
drop policy if exists "Public archive can update entries" on public.food_entries;
create policy "Public archive can update entries"
on public.food_entries for update
to anon
using (true)
with check (true);

-- 4) Quick check — after running, this should return is_loved with type boolean.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'food_entries'
  and column_name = 'is_loved';
