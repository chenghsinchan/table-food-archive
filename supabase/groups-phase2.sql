-- =============================================================================
-- TABLE — Group Sharing, Phase 2 helper
--
-- Auto-enrolls the two original allowed users (Cheng + Saulė) into the default
-- "Cheng + Saulė Home" group the moment their profile is first created.
--
-- This is how Saulė gets added automatically: she just logs in once, her
-- profile row is created, and this trigger adds her to the Home group.
-- Existing members are left untouched (on conflict do nothing).
--
-- Safe + additive. Run the whole file in the Supabase SQL Editor.
-- =============================================================================

create or replace function public.auto_enroll_allowed_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_group_id uuid;
begin
  if lower(new.email) in ('chenghsinchan@gmail.com', 'saulemiezyte@gmail.com') then
    select id into default_group_id
    from public.groups
    where name = 'Cheng + Saulė Home'
    limit 1;

    if default_group_id is not null then
      insert into public.group_members (group_id, user_id, role)
      values (default_group_id, new.id, 'member')
      on conflict (group_id, user_id) do nothing;

      update public.profiles
      set active_group_id = coalesce(active_group_id, default_group_id)
      where id = new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists auto_enroll_allowed_user_trigger on public.profiles;
create trigger auto_enroll_allowed_user_trigger
after insert on public.profiles
for each row execute function public.auto_enroll_allowed_user();
