-- =============================================================================
-- TABLE — allow any group MEMBER (not only the owner) to edit the group's
-- name and description. Safe + additive: only swaps the update policy.
-- Run the whole file in the Supabase SQL Editor.
-- =============================================================================

drop policy if exists "Owners update their group" on public.groups;
drop policy if exists "Members update their group" on public.groups;

create policy "Members update their group"
on public.groups for update
to authenticated
using (public.is_group_member(id, auth.uid()))
with check (public.is_group_member(id, auth.uid()));
