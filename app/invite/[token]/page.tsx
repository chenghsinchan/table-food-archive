"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { GroupInvite } from "@/types/food";
import { InviteAccept } from "@/components/auth/InviteAccept";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { getInviteByToken } from "@/lib/supabase/groups";

type PageState =
  | { status: "loading" }
  | { status: "accept"; invite: GroupInvite }
  | { status: "invalid" }
  | { status: "mismatch"; email: string };

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      if (!supabase) {
        if (active) setState({ status: "invalid" });
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const token = Array.isArray(params.token) ? params.token[0] : params.token;
      const invite = token ? await getInviteByToken(supabase, token) : null;

      if (!active) return;

      if (!invite || invite.status !== "pending") {
        setState({ status: "invalid" });
        return;
      }

      if (invite.invitedEmail.toLowerCase() !== (user.email ?? "").toLowerCase()) {
        setState({ status: "mismatch", email: invite.invitedEmail });
        return;
      }

      setState({ status: "accept", invite });
    }

    load();

    return () => {
      active = false;
    };
  }, [params.token, router]);

  if (state.status === "loading") {
    return (
      <div className="pt-8">
        <LoadingState />
      </div>
    );
  }

  if (state.status === "accept") {
    return <InviteAccept invites={[state.invite]} />;
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="liquid-island w-full max-w-sm space-y-3 rounded-[28px] p-7 text-center">
        <h1 className="font-serif text-3xl italic leading-tight text-ink">
          {state.status === "mismatch" ? "Invite is for another email" : "Invite not available"}
        </h1>
        <p className="text-sm leading-6 text-muted">
          {state.status === "mismatch"
            ? `This invitation was sent to ${state.email}. Sign in with that Google account to accept it.`
            : "This invite link is no longer valid. Ask for a fresh invitation."}
        </p>
      </div>
    </div>
  );
}
