import type { SupabaseClient } from "@supabase/supabase-js";
import type { Group, GroupInvite, GroupMember, GroupRole } from "@/types/food";
import { MAX_MEMBERS_PER_GROUP } from "@/lib/groups/constants";

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "T"
  );
}

type GroupMembershipRow = {
  role: GroupRole;
  groups: { id: string; name: string; description: string | null } | null;
};

/** Groups the signed-in user belongs to (with their role in each). */
export async function getUserGroups(supabase: SupabaseClient, userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("role, groups(id, name, description)")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as GroupMembershipRow[])
    .filter((row) => row.groups)
    .map((row) => ({
      id: row.groups!.id,
      name: row.groups!.name,
      description: row.groups!.description ?? undefined,
      role: row.role
    }));
}

type MemberRow = { user_id: string; role: GroupRole };
type ProfileRow = { id: string; display_name: string | null; email: string; avatar_url: string | null };

/** Members of a group, joined with their profile name/avatar. */
export async function getGroupMembers(supabase: SupabaseClient, groupId: string): Promise<GroupMember[]> {
  const { data: memberRows, error } = await supabase
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", groupId);

  if (error) {
    throw error;
  }

  const members = (memberRows ?? []) as MemberRow[];

  if (!members.length) {
    return [];
  }

  const ids = members.map((member) => member.user_id);
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url")
    .in("id", ids);

  const profiles = new Map(((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));

  return members
    .map((member) => {
      const profile = profiles.get(member.user_id);
      const name = profile?.display_name || profile?.email?.split("@")[0] || "TABLE";

      return {
        userId: member.user_id,
        role: member.role,
        name,
        email: profile?.email ?? "",
        avatarUrl: profile?.avatar_url ?? undefined,
        initials: initialsFor(name)
      };
    })
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "owner" ? -1 : 1));
}

/** The group id the user last chose (stored on their profile). */
export async function getActiveGroupId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("active_group_id").eq("id", userId).maybeSingle();

  return (data?.active_group_id as string | null) ?? null;
}

/** Remember the user's active group on their profile. */
export async function setActiveGroupId(supabase: SupabaseClient, userId: string, groupId: string) {
  const { error } = await supabase.from("profiles").update({ active_group_id: groupId }).eq("id", userId);

  if (error) {
    throw error;
  }
}

/** Pending invites addressed to this email (so a new person can see/accept). */
export async function getPendingInvitesForEmail(supabase: SupabaseClient, email: string): Promise<GroupInvite[]> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("group_invites")
    .select("id, group_id, invited_email, status, token, groups(name)")
    .eq("status", "pending")
    .ilike("invited_email", normalized);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    group_id: string;
    invited_email: string;
    status: GroupInvite["status"];
    token: string;
    groups: { name: string } | null;
  }>).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: row.groups?.name,
    invitedEmail: row.invited_email,
    status: row.status,
    token: row.token
  }));
}

/** Create a group and add the creator as its owner. Returns the new group id. */
export async function createGroup(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  description?: string
): Promise<string> {
  // Generate the id on the client so we never need to read the row back right
  // after inserting it — the group's read rule requires membership, which only
  // exists after the next insert, so a `.select()` here would return nothing.
  const groupId =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  const { error } = await supabase
    .from("groups")
    .insert({ id: groupId, name: name.trim(), description: description?.trim() || null, created_by: userId });

  if (error) {
    throw error;
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId, role: "owner" });

  if (memberError) {
    // Roll back the empty group so we never leave an orphan the user can't see.
    await supabase.from("groups").delete().eq("id", groupId);
    throw new Error(memberError.message || "Could not create the group.");
  }

  return groupId;
}

/** Remove a member from a group (also used to leave a group yourself). */
export async function removeMember(supabase: SupabaseClient, groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Could not remove this member.");
  }
}

/** Update a group's name and description. Any member may edit. */
export async function updateGroup(
  supabase: SupabaseClient,
  groupId: string,
  name: string,
  description?: string
): Promise<void> {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Give the group a name.");
  }

  const { error } = await supabase
    .from("groups")
    .update({ name: trimmed, description: description?.trim() || null })
    .eq("id", groupId);

  if (error) {
    throw new Error(error.message || "Could not update the group.");
  }
}

/** True if the user is a member of at least one group. */
export async function getMembershipCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getGroupMemberCount(supabase: SupabaseClient, groupId: string): Promise<number> {
  const { count, error } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/**
 * Create (or reuse) a pending invite for an email to join a group, and return
 * its share token. Enforces the 4-member limit and avoids duplicate invites.
 */
export async function createInvite(
  supabase: SupabaseClient,
  groupId: string,
  invitedEmail: string,
  invitedBy: string
): Promise<{ token: string }> {
  const email = invitedEmail.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if ((await getGroupMemberCount(supabase, groupId)) >= MAX_MEMBERS_PER_GROUP) {
    throw new Error("This group already has 4 members.");
  }

  // Reuse an existing invite for this email + group instead of duplicating.
  const { data: existing } = await supabase
    .from("group_invites")
    .select("id, token, status")
    .eq("group_id", groupId)
    .ilike("invited_email", email)
    .maybeSingle();

  if (existing?.status === "pending") {
    return { token: existing.token as string };
  }

  const { data, error } = await supabase
    .from("group_invites")
    .insert({ group_id: groupId, invited_email: email, invited_by: invitedBy })
    .select("token")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Lost a race / non-pending duplicate: return whatever invite exists.
      const { data: dup } = await supabase
        .from("group_invites")
        .select("token")
        .eq("group_id", groupId)
        .ilike("invited_email", email)
        .maybeSingle();

      if (dup?.token) {
        return { token: dup.token as string };
      }
    }

    throw error;
  }

  return { token: (data as { token: string }).token };
}

/** Look up a pending invite by its share token. */
export async function getInviteByToken(supabase: SupabaseClient, token: string): Promise<GroupInvite | null> {
  const { data } = await supabase
    .from("group_invites")
    .select("id, group_id, invited_email, status, token")
    .eq("token", token)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    groupId: data.group_id as string,
    invitedEmail: data.invited_email as string,
    status: data.status as GroupInvite["status"],
    token: data.token as string
  };
}

/** Accept an invite: join the group and mark the invite accepted. */
export async function acceptInvite(
  supabase: SupabaseClient,
  invite: { id: string; groupId: string },
  userId: string
): Promise<void> {
  const { error: joinError } = await supabase
    .from("group_members")
    .insert({ group_id: invite.groupId, user_id: userId, role: "member" });

  if (joinError && joinError.code !== "23505") {
    // Surface the friendly limit messages raised by the database triggers.
    throw new Error(joinError.message || "Could not join this group.");
  }

  await supabase
    .from("group_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);
}

/** Decline an invite. */
export async function declineInvite(supabase: SupabaseClient, inviteId: string): Promise<void> {
  const { error } = await supabase.from("group_invites").update({ status: "declined" }).eq("id", inviteId);

  if (error) {
    throw error;
  }
}
