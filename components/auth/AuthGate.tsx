"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import type { GroupInvite } from "@/types/food";
import { InviteAccept } from "@/components/auth/InviteAccept";
import { NeedInvitation } from "@/components/auth/NeedInvitation";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { LoadingState } from "@/components/ui/LoadingState";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import { acceptAppInvite, getAppInviteForEmail } from "@/lib/supabase/app-invites";
import { getMembershipCount, getPendingInvitesForEmail } from "@/lib/supabase/groups";

type AuthGateProps = {
  children: React.ReactNode;
};

type GateState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "profile"; user: User }
  | { status: "invite"; invites: GroupInvite[] }
  | { status: "no-invite"; email?: string | null }
  | { status: "error" }
  | { status: "private" };

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const supabase = createClient();

      if (!supabase) {
        if (active) setState({ status: "ready" });
        return;
      }

      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!active) return;

        if (!user) {
          router.replace("/login");
          return;
        }

        // Access is granted to the original allowed users, group members, or
        // anyone invited to TABLE with an app invite. App-invited friends enter
        // without a group — a member can add them to a group later by email.
        if (!isAllowedEmail(user.email)) {
          const memberships = await getMembershipCount(supabase, user.id);

          if (!active) return;

          if (memberships === 0) {
            const invites = user.email ? await getPendingInvitesForEmail(supabase, user.email) : [];

            if (!active) return;

            if (invites.length) {
              setState({ status: "invite", invites });
              return;
            }

            const appInvite = user.email ? await getAppInviteForEmail(supabase, user.email) : null;

            if (!active) return;

            if (!appInvite) {
              setState({ status: "no-invite", email: user.email });
              return;
            }

            if (appInvite.status === "pending") {
              await acceptAppInvite(supabase, appInvite.id);
            }
          }
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (!profile?.display_name) {
          setState({ status: "profile", user });
          return;
        }

        trackEvent("app_opened");
        setState({ status: "ready" });
      } catch {
        // Never leave the user stuck on a spinner if a lookup fails.
        if (active) setState({ status: "error" });
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  if (state.status === "loading") {
    return (
      <div className="pt-8">
        <LoadingState />
      </div>
    );
  }

  if (state.status === "profile") {
    return <ProfileSetup user={state.user} onComplete={() => setState({ status: "ready" })} />;
  }

  if (state.status === "invite") {
    return <InviteAccept invites={state.invites} />;
  }

  if (state.status === "no-invite") {
    return <NeedInvitation email={state.email} />;
  }

  if (state.status === "error") {
    return (
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="liquid-island w-full max-w-sm space-y-4 rounded-[28px] p-7 text-center">
          <h1 className="font-serif text-3xl italic leading-tight text-ink">Could not load TABLE</h1>
          <p className="text-sm leading-6 text-muted">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="tap-scale inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "private") {
    return null;
  }

  return <>{children}</>;
}
