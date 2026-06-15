"use client";

import { useEffect, useState } from "react";
import { Chrome, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LoginScreenProps = {
  privateArchive?: boolean;
};

export function LoginScreen({ privateArchive }: LoginScreenProps) {
  const [error, setError] = useState(privateArchive ? "This archive is private." : "");

  useEffect(() => {
    if (!privateArchive) {
      return;
    }

    createClient()?.auth.signOut();
  }, [privateArchive]);

  async function signInWithGoogle() {
    setError("");

    const supabase = createClient();

    if (!supabase) {
      setError("Add Supabase environment variables to enable private Google sign-in.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (signInError) {
      setError(signInError.message);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <section className="liquid-island w-full max-w-sm rounded-[28px] p-6 text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-ink text-white">
          <LockKeyhole aria-hidden="true" size={24} strokeWidth={1.8} />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-accent">Private archive</p>
          <h1 className="table-wordmark text-5xl text-ink">TABLE</h1>
          <p className="text-base leading-7 text-muted">
            Sign in with Google to open the shared food archive.
          </p>
        </div>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="tap-scale mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-pill bg-ink px-5 text-base font-semibold text-white"
        >
          <Chrome aria-hidden="true" size={18} />
          Continue with Google
        </button>
        {error ? <p className="mt-4 text-sm leading-6 text-accent">{error}</p> : null}
      </section>
    </div>
  );
}
