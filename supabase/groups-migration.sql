-- =============================================================================
-- TABLE — Group Sharing migration (Phase 1)
--
-- Adds small private groups so the food archive is only visible to members
-- of the same group. ADDITIVE + safe:
--   * creates new tables (groups, group_members, group_invites)
--   * adds food_entries.group_id and profiles.active_group_id
--   * creates a default group "Cheng + Saulė Home" and moves ALL existing
--     entries into it, with Cheng (owner) + Saulė (member)
--   * replaces the old wide-open security rules with group-private ones
--
-- It does NOT delete any food entry, photo, tag, profile, or storage file,
-- and never resets the database. Safe to run more than once (idempotent).
--
-- Run the whole file in the Supabase SQL Editor. The SELECTs at the very
-- bottom are checks you can read to confirm it worked.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) New tables
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  unique (group_id, user_id)
);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  invited_email text not null,
  invited_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  token uuid default gen_random_uuid(),
  created_at timestamptz default now(),
  accepted_at timestamptz,
  unique (group_id, invited_email)
);

create index if not exists group_members_user_idx   on public.group_members(user_id);
create index if not exists group_members_group_idx  on public.group_members(group_id);
create index if not exists group_invites_email_idx   on public.group_invites(lower(invited_email));
create index if not exists group_invites_token_idx   on public.group_invites(token);

-- -----------------------------------------------------------------------------
-- 2) Link food entries to a group (nullable so existing rows do not break)
-- -----------------------------------------------------------------------------
alter table public.food_entries
  add column if not exists group_id uuid references public.groups(id);

create index if not exists food_entries_group_idx on public.food_entries(group_id);

-- -----------------------------------------------------------------------------
-- 3) Remember each user's active group (used by the app to pick what to show)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists active_group_id uuid references public.groups(id);

-- -----------------------------------------------------------------------------
-- 4) Membership helper (SECURITY DEFINER avoids row-level-security recursion)
-- -----------------------------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id = p_user_id
  );
$$;

-- -----------------------------------------------------------------------------
-- 5) Enforce limits in the database: max 4 members per group, max 2 groups/user
-- -----------------------------------------------------------------------------
create or replace function public.enforce_group_limits()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.group_members where group_id = new.group_id) >= 4 then
    raise exception 'This group already has 4 members.';
  end if;

  if (select count(*) from public.group_members where user_id = new.user_id) >= 2 then
    raise exception 'You can only join up to 2 groups for now.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_group_limits_trigger on public.group_members;
create trigger enforce_group_limits_trigger
before insert on public.group_members
for each row execute function public.enforce_group_limits();

-- keep groups.updated_at fresh (reuses the existing set_updated_at function)
drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6) Default group + migrate existing content (Cheng owner, Saulė member)
-- -----------------------------------------------------------------------------
insert into public.groups (name, description, created_by)
select 'Cheng + Saulė Home', 'Original TABLE archive', p.id
from public.profiles p
where p.email = 'chenghsinchan@gmail.com'
  and not exists (select 1 from public.groups where name = 'Cheng + Saulė Home');

insert into public.group_members (group_id, user_id, role)
select g.id,
       p.id,
       case when p.email = 'chenghsinchan@gmail.com' then 'owner' else 'member' end
from public.groups g
cross join public.profiles p
where g.name = 'Cheng + Saulė Home'
  and p.email in ('chenghsinchan@gmail.com', 'saulemiezyte@gmail.com')
on conflict (group_id, user_id) do nothing;

-- move every existing entry that has no group yet into the default group
update public.food_entries
set group_id = (select id from public.groups where name = 'Cheng + Saulė Home' limit 1)
where group_id is null;

-- set both users' active group to the default group (only if they have none yet)
update public.profiles
set active_group_id = (select id from public.groups where name = 'Cheng + Saulė Home' limit 1)
where email in ('chenghsinchan@gmail.com', 'saulemiezyte@gmail.com')
  and active_group_id is null;

-- -----------------------------------------------------------------------------
-- 7) Security rules for the new tables
-- -----------------------------------------------------------------------------
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;

-- groups: read groups you belong to; anyone signed in can create; owners edit
drop policy if exists "Read groups you belong to" on public.groups;
create policy "Read groups you belong to"
on public.groups for select to authenticated
using (public.is_group_member(id, auth.uid()));

drop policy if exists "Create groups" on public.groups;
create policy "Create groups"
on public.groups for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "Owners update their group" on public.groups;
create policy "Owners update their group"
on public.groups for update to authenticated
using (exists (
  select 1 from public.group_members m
  where m.group_id = id and m.user_id = auth.uid() and m.role = 'owner'
))
with check (exists (
  select 1 from public.group_members m
  where m.group_id = id and m.user_id = auth.uid() and m.role = 'owner'
));

-- group_members: read members of your groups; add yourself (accept invite) or
-- add others if you are already a member; remove yourself
drop policy if exists "Read members of your groups" on public.group_members;
create policy "Read members of your groups"
on public.group_members for select to authenticated
using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Add members" on public.group_members;
create policy "Add members"
on public.group_members for insert to authenticated
with check (user_id = auth.uid() or public.is_group_member(group_id, auth.uid()));

drop policy if exists "Leave group" on public.group_members;
create policy "Leave group"
on public.group_members for delete to authenticated
using (user_id = auth.uid());

-- group_invites: see invites you sent, invites addressed to your email, or
-- invites for groups you belong to; members create; recipients respond
drop policy if exists "Read relevant invites" on public.group_invites;
create policy "Read relevant invites"
on public.group_invites for select to authenticated
using (
  invited_by = auth.uid()
  or lower(invited_email) = lower(auth.jwt() ->> 'email')
  or public.is_group_member(group_id, auth.uid())
);

drop policy if exists "Members create invites" on public.group_invites;
create policy "Members create invites"
on public.group_invites for insert to authenticated
with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Recipients respond to invites" on public.group_invites;
create policy "Recipients respond to invites"
on public.group_invites for update to authenticated
using (
  lower(invited_email) = lower(auth.jwt() ->> 'email')
  or invited_by = auth.uid()
)
with check (
  lower(invited_email) = lower(auth.jwt() ->> 'email')
  or invited_by = auth.uid()
);

-- -----------------------------------------------------------------------------
-- 8) Replace the OLD wide-open food_entries rules with group-private ones
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated users can read entries"   on public.food_entries;
drop policy if exists "Public archive can read entries"        on public.food_entries;
drop policy if exists "Authenticated users can create entries" on public.food_entries;
drop policy if exists "Public archive can create entries"      on public.food_entries;
drop policy if exists "Authenticated users can update entries" on public.food_entries;
drop policy if exists "Public archive can update entries"      on public.food_entries;
drop policy if exists "Authenticated users can delete entries" on public.food_entries;
drop policy if exists "Public archive can delete entries"      on public.food_entries;

create policy "Read entries in your groups"
on public.food_entries for select to authenticated
using (public.is_group_member(group_id, auth.uid()));

create policy "Create entries in your groups"
on public.food_entries for insert to authenticated
with check (public.is_group_member(group_id, auth.uid()));

create policy "Update entries in your groups"
on public.food_entries for update to authenticated
using (public.is_group_member(group_id, auth.uid()))
with check (public.is_group_member(group_id, auth.uid()));

create policy "Delete entries in your groups"
on public.food_entries for delete to authenticated
using (public.is_group_member(group_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 9) Photos: readable/editable only for entries in your groups
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated users can read photos"   on public.photos;
drop policy if exists "Public archive can read photos"        on public.photos;
drop policy if exists "Authenticated users can create photos" on public.photos;
drop policy if exists "Public archive can create photos"      on public.photos;
drop policy if exists "Authenticated users can update photos" on public.photos;
drop policy if exists "Public archive can update photos"      on public.photos;
drop policy if exists "Authenticated users can delete photos" on public.photos;
drop policy if exists "Public archive can delete photos"      on public.photos;

create policy "Read photos in your groups"
on public.photos for select to authenticated
using (exists (
  select 1 from public.food_entries e
  where e.id = photos.food_entry_id and public.is_group_member(e.group_id, auth.uid())
));

create policy "Create photos in your groups"
on public.photos for insert to authenticated
with check (exists (
  select 1 from public.food_entries e
  where e.id = photos.food_entry_id and public.is_group_member(e.group_id, auth.uid())
));

create policy "Update photos in your groups"
on public.photos for update to authenticated
using (exists (
  select 1 from public.food_entries e
  where e.id = photos.food_entry_id and public.is_group_member(e.group_id, auth.uid())
))
with check (exists (
  select 1 from public.food_entries e
  where e.id = photos.food_entry_id and public.is_group_member(e.group_id, auth.uid())
));

create policy "Delete photos in your groups"
on public.photos for delete to authenticated
using (exists (
  select 1 from public.food_entries e
  where e.id = photos.food_entry_id and public.is_group_member(e.group_id, auth.uid())
));

-- -----------------------------------------------------------------------------
-- 10) Entry<->tag links: scoped to entries in your groups
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated users can read entry tags"   on public.food_entry_tags;
drop policy if exists "Public archive can read entry tags"        on public.food_entry_tags;
drop policy if exists "Authenticated users can create entry tags" on public.food_entry_tags;
drop policy if exists "Public archive can create entry tags"      on public.food_entry_tags;
drop policy if exists "Authenticated users can delete entry tags" on public.food_entry_tags;
drop policy if exists "Public archive can delete entry tags"      on public.food_entry_tags;

create policy "Read entry tags in your groups"
on public.food_entry_tags for select to authenticated
using (exists (
  select 1 from public.food_entries e
  where e.id = food_entry_tags.food_entry_id and public.is_group_member(e.group_id, auth.uid())
));

create policy "Create entry tags in your groups"
on public.food_entry_tags for insert to authenticated
with check (exists (
  select 1 from public.food_entries e
  where e.id = food_entry_tags.food_entry_id and public.is_group_member(e.group_id, auth.uid())
));

create policy "Delete entry tags in your groups"
on public.food_entry_tags for delete to authenticated
using (exists (
  select 1 from public.food_entries e
  where e.id = food_entry_tags.food_entry_id and public.is_group_member(e.group_id, auth.uid())
));

-- -----------------------------------------------------------------------------
-- 11) Tags stay global, but only for signed-in users (drop anonymous access)
-- -----------------------------------------------------------------------------
drop policy if exists "Public archive can read tags"   on public.tags;
drop policy if exists "Public archive can create tags" on public.tags;
drop policy if exists "Public archive can update tags" on public.tags;
-- "Authenticated users can read tags" / "... can create tags" already exist and stay.

-- =============================================================================
-- CHECKS — read these results to confirm success
-- =============================================================================

-- (a) Should be 0: every existing entry now has a group.
select count(*) as entries_without_group
from public.food_entries
where group_id is null;

-- (b) Should list "Cheng + Saulė Home" with 2 members.
select g.name, count(m.*) as member_count
from public.groups g
left join public.group_members m on m.group_id = g.id
group by g.name;

-- (c) The two members of the default group.
select g.name as group_name, p.email, m.role
from public.group_members m
join public.groups g on g.id = m.group_id
join public.profiles p on p.id = m.user_id
order by m.role desc;
