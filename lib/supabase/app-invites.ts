import type { SupabaseClient } from "@supabase/supabase-js";

export type AppInvite = {
  id: string;
  invitedEmail: string;
  status: "pending" | "accepted";
  token: string;
};

type AppInviteRow = {
  id: string;
  invited_email: string;
  status: "pending" | "accepted";
  token: string;
};

function transformInvite(row: AppInviteRow): AppInvite {
  return {
    id: row.id,
    invitedEmail: row.invited_email,
    status: row.status,
    token: row.token
  };
}

function friendlyError(error: { message?: string }) {
  if (error.message?.includes("app_invites")) {
    return new Error("Friend invites need a database update. Run supabase/app-invites.sql in the Supabase SQL Editor once.");
  }

  return new Error(error.message || "Could not create the invite.");
}

/** Invites this user has sent. */
export async function getSentAppInvites(supabase: SupabaseClient, userId: string): Promise<AppInvite[]> {
  const { data, error } = await supabase
    .from("app_invites")
    .select("id, invited_email, status, token")
    .eq("invited_by", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw friendlyError(error);
  }

  return ((data ?? []) as AppInviteRow[]).map(transformInvite);
}

/**
 * Create (or reuse) an app invite for an email and return it.
 * The 3-invite limit (owner exempt) is enforced by the database.
 */
export async function createAppInvite(
  supabase: SupabaseClient,
  invitedEmail: string,
  invitedBy: string
): Promise<AppInvite> {
  const email = invitedEmail.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const { data, error } = await supabase
    .from("app_invites")
    .insert({ invited_email: email, invited_by: invitedBy })
    .select("id, invited_email, status, token")
    .single();

  if (error) {
    // Unique index: this email was already invited (by you or someone else).
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("app_invites")
        .select("id, invited_email, status, token")
        .ilike("invited_email", email)
        .maybeSingle();

      if (existing) {
        return transformInvite(existing as AppInviteRow);
      }

      throw new Error("This email has already been invited by someone else.");
    }

    throw friendlyError(error);
  }

  return transformInvite(data as AppInviteRow);
}

/** The invite addressed to this email, if any (pending or accepted). */
export async function getAppInviteForEmail(supabase: SupabaseClient, email: string): Promise<AppInvite | null> {
  const { data, error } = await supabase
    .from("app_invites")
    .select("id, invited_email, status, token")
    .ilike("invited_email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    return null;
  }

  return data ? transformInvite(data as AppInviteRow) : null;
}

/** Mark an invite accepted after the invited person signs in. */
export async function acceptAppInvite(supabase: SupabaseClient, inviteId: string): Promise<void> {
  await supabase
    .from("app_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending");
}
