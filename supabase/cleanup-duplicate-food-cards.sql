-- Run this once in the Supabase SQL editor if old local syncs created duplicates.
-- It keeps the newest card for exact duplicate title/date/type/note/recipe groups.

with ranked_entries as (
  select
    id,
    row_number() over (
      partition by
        lower(trim(title)),
        entry_date,
        type,
        lower(trim(coalesce(notes, ''))),
        lower(trim(coalesce(recipe, '')))
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as duplicate_rank
  from public.food_entries
  where is_archived = false
),
duplicate_entries as (
  select id
  from ranked_entries
  where duplicate_rank > 1
)
delete from public.food_entries
where id in (select id from duplicate_entries);
