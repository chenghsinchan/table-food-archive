"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { LoadingState } from "@/components/ui/LoadingState";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { createClient } from "@/lib/supabase/client";

type AuthGateProps = {
  children: React.ReactNode;
};

type GateState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "profile"; user: User }
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

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!isAllowedEmail(user.email)) {
        await supabase.auth.signOut();
        if (active) {
          setState({ status: "private" });
          router.replace("/login?private=1");
        }
        return;
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

      setState({ status: "ready" });
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

  if (state.status === "private") {
    return null;
  }

  return <>{children}</>;
}
