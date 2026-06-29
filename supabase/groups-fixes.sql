-- =============================================================================
-- TABLE — Group Sharing fixes
--
-- Lets any member of a group manage that group (not just the owner):
--   * remove members (and leave the group themselves)
--   * edit the group's name / description
--
-- Safe + additive. Run the whole file in the Supabase SQL Editor.
-- (Creating a group is fixed in the app code and needs no SQL.)
-- =============================================================================

-- Any member can remove any member of their group (previously: only yourself).
drop policy if exists "Leave group" on public.group_members;
drop policy if exists "Members manage members" on public.group_members;
create policy "Members manage members"
on public.group_members for delete to authenticated
using (public.is_group_member(group_id, auth.uid()));

-- Any member can edit the group (previously: owner only).
drop policy if exists "Owners update their group" on public.groups;
drop policy if exists "Members update their group" on public.groups;
create policy "Members update their group"
on public.groups for update to authenticated
using (public.is_group_member(id, auth.uid()))
with check (public.is_group_member(id, auth.uid()));
