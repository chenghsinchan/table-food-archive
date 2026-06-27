"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import type { GroupInvite } from "@/types/food";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite, declineInvite } from "@/lib/supabase/groups";

type InviteAcceptProps = {
  invites: GroupInvite[];
};

export function InviteAccept({ invites }: InviteAcceptProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept(invite: GroupInvite) {
    setError("");
    setBusy(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Accepting needs Supabase to be connected.");
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sign in again to accept.");
      }

      await acceptInvite(supabase, { id: invite.id, groupId: invite.groupId }, user.id);
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not accept this invite.");
      setBusy(false);
    }
  }

  async function decline(invite: GroupInvite) {
    setError("");
    setBusy(true);

    try {
      const supabase = createClient();
      if (supabase) {
        await declineInvite(supabase, invite.id);
      }
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not decline this invite.");
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="liquid-island w-full max-w-sm space-y-5 rounded-[28px] p-7 text-center">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Invitation</p>
          <h1 className="font-serif text-3xl italic leading-tight text-ink">You&apos;ve been invited</h1>
        </div>

        <div className="space-y-4">
          {invites.map((invite) => (
            <div key={invite.id} className="space-y-3 rounded-[20px] border border-border bg-white p-4">
              <p className="text-base font-semibold text-ink">Join {invite.groupName || "a TABLE group"}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => accept(invite)}
                  className="tap-scale flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
                >
                  <Check aria-hidden="true" size={16} />
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decline(invite)}
                  className="tap-scale flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-warm px-4 text-sm font-semibold text-ink disabled:opacity-70"
                >
                  <X aria-hidden="true" size={16} />
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}

        <button type="button" onClick={signOut} className="tap-scale text-sm font-medium text-muted hover:text-ink">
          Sign out
        </button>
      </div>
    </div>
  );
}
