"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LoginScreenProps = {
  privateArchive?: boolean;
};

export function LoginScreen({ privateArchive }: LoginScreenProps) {
  const [error, setError] = useState(privateArchive ? "This archive is private." : "");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!privateArchive) {
      return;
    }

    createClient()?.auth.signOut();
  }, [privateArchive]);

  async function signInWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);

    const supabase = createClient();

    if (!supabase) {
      setError("Add Supabase environment variables to enable private sign-in.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Add your email first.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setSent(true);
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
            Enter your email to open the shared food archive.
          </p>
        </div>
        <form className="mt-7 grid gap-3" onSubmit={signInWithEmail}>
          <label className="sr-only" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@example.com"
            className="min-h-14 rounded-pill border border-border bg-white px-5 text-center text-base outline-none transition focus:border-ink"
          />
          <button
            type="submit"
            className="tap-scale flex min-h-14 w-full items-center justify-center gap-2 rounded-pill bg-ink px-5 text-base font-semibold text-white"
          >
            <Mail aria-hidden="true" size={18} />
            Email me a sign-in link
          </button>
        </form>
        {sent ? <p className="mt-4 text-sm leading-6 text-muted">Check your email for the TABLE sign-in link.</p> : null}
        {error ? <p className="mt-4 text-sm leading-6 text-accent">{error}</p> : null}
      </section>
    </div>
  );
}
