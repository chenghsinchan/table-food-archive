"use client";

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NeedInvitationProps = {
  email?: string | null;
};

export function NeedInvitation({ email }: NeedInvitationProps) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="liquid-island w-full max-w-sm rounded-[28px] p-7 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-surface-warm text-ink">
          <Mail aria-hidden="true" size={24} strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 font-serif text-3xl italic leading-tight text-ink">You need an invitation</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          TABLE is private. Ask a member to invite{email ? ` ${email}` : " you"} to their group, then sign in again.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="tap-scale mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
