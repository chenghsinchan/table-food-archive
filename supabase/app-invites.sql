-- =============================================================================
-- TABLE — app-level invites + new group limits
--
-- What this adds/changes:
--   * app_invites table: invite a friend to TABLE itself (not to a group).
--     Each user can invite up to 3 friends; chenghsinchan@gmail.com is exempt
--     and can invite unlimited friends.
--   * Group limit raised: each user can now be in up to 3 groups (was 2).
--     Groups stay 1–4 people.
--   * Group members may now remove other members (needed for Edit group).
--
-- Safe + additive: no data is deleted. Run the whole file in the SQL Editor.
-- =============================================================================

-- 1) App invites
create table if not exists public.app_invites (
  id uuid primary key default gen_random_uuid(),
  invited_email text not null,
  invited_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  token uuid default gen_random_uuid(),
  created_at timestamptz default now(),
  accepted_at timestamptz
);

-- One invite per email address (case-insensitive).
create unique index if not exists app_invites_email_key on public.app_invites (lower(invited_email));
create index if not exists app_invites_inviter_idx on public.app_invites (invited_by);

-- 2) Limit: 3 invites per user; the app owner is exempt.
create or replace function public.enforce_app_invite_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inviter_email text;
begin
  select email into inviter_email from auth.users where id = new.invited_by;

  if lower(coalesce(inviter_email, '')) <> 'chenghsinchan@gmail.com' then
    if (select count(*) from public.app_invites where invited_by = new.invited_by) >= 3 then
      raise exception 'You can invite up to 3 friends for now.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_app_invite_limit_trigger on public.app_invites;
create trigger enforce_app_invite_limit_trigger
before insert on public.app_invites
for each row execute function public.enforce_app_invite_limit();

-- 3) Privacy rules for app invites
alter table public.app_invites enable row level security;

drop policy if exists "Read own app invites" on public.app_invites;
create policy "Read own app invites"
on public.app_invites for select to authenticated
using (
  invited_by = auth.uid()
  or lower(invited_email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Send app invites" on public.app_invites;
create policy "Send app invites"
on public.app_invites for insert to authenticated
with check (invited_by = auth.uid());

drop policy if exists "Respond to app invites" on public.app_invites;
create policy "Respond to app invites"
on public.app_invites for update to authenticated
using (
  lower(invited_email) = lower(auth.jwt() ->> 'email')
  or invited_by = auth.uid()
)
with check (
  lower(invited_email) = lower(auth.jwt() ->> 'email')
  or invited_by = auth.uid()
);

drop policy if exists "Revoke own app invites" on public.app_invites;
create policy "Revoke own app invites"
on public.app_invites for delete to authenticated
using (invited_by = auth.uid());

-- 4) Raise the per-user group limit from 2 to 3 (groups stay max 4 members).
create or replace function public.enforce_group_limits()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.group_members where group_id = new.group_id) >= 4 then
    raise exception 'This group already has 4 members.';
  end if;

  if (select count(*) from public.group_members where user_id = new.user_id) >= 3 then
    raise exception 'You can only join up to 3 groups for now.';
  end if;

  return new;
end;
$$;

-- 5) Let group members remove other members (Edit group -> remove).
drop policy if exists "Leave group" on public.group_members;
drop policy if exists "Members manage membership" on public.group_members;
create policy "Members manage membership"
on public.group_members for delete to authenticated
using (
  user_id = auth.uid()
  or public.is_group_member(group_id, auth.uid())
);

-- 6) Check: should list the app_invites columns.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'app_invites'
order by ordinal_position;
