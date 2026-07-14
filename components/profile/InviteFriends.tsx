"use client";

import { useEffect, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createAppInvite, getSentAppInvites, type AppInvite } from "@/lib/supabase/app-invites";
import { MAX_APP_INVITES, OWNER_EMAIL } from "@/lib/groups/constants";

export function InviteFriends() {
  const [invites, setInvites] = useState<AppInvite[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [connected, setConnected] = useState(true);
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();

      if (!supabase) {
        setConnected(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user || !active) {
        return;
      }

      setIsOwner((user.email ?? "").toLowerCase() === OWNER_EMAIL);

      try {
        const sent = await getSentAppInvites(supabase, user.id);
        if (active) setInvites(sent);
      } catch {
        // List stays empty; creating an invite will surface any real error.
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const limitReached = !isOwner && invites.length >= MAX_APP_INVITES;

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInviteLink("");
    setCopied(false);
    setBusy(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Inviting needs Supabase to be connected.");
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sign in again to send an invite.");
      }

      const invite = await createAppInvite(supabase, email, user.id);

      setInvites((current) =>
        current.some((existing) => existing.id === invite.id) ? current : [...current, invite]
      );
      setInviteLink(`${window.location.origin}/join/${invite.token}`);
      setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!connected) {
    return null;
  }

  return (
    <section className="liquid-island space-y-4 rounded-[28px] p-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Invite friends to TABLE</p>
        <p className="text-sm leading-6 text-muted">
          Invited friends can sign in with Google and start their own archive right away. They join yours
          only when an archive member adds them.
        </p>
      </div>

      {limitReached ? (
        <p className="text-sm leading-6 text-muted">You can invite up to {MAX_APP_INVITES} friends for now.</p>
      ) : (
        <form onSubmit={handleInvite} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@gmail.com"
            className="min-h-12 w-full rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            <UserPlus aria-hidden="true" size={17} />
            {busy ? "Creating…" : "Create invite link"}
          </button>
        </form>
      )}

      {inviteLink ? (
        <div className="space-y-2 rounded-lg border border-border bg-white p-3">
          <p className="text-sm font-medium text-ink">Invite created. Send them this link.</p>
          <p className="break-all font-mono text-xs text-muted">{inviteLink}</p>
          <button
            type="button"
            onClick={copyLink}
            className="tap-scale flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-surface-warm px-4 text-sm font-semibold text-ink"
          >
            {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
            {copied ? "Copied" : "Copy invite link"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}

      {invites.length ? (
        <div className="space-y-1 border-t border-border pt-4">
          <p className="pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Invited {isOwner ? `(${invites.length})` : `(${invites.length}/${MAX_APP_INVITES})`}
          </p>
          <ul className="space-y-1">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">{invite.invitedEmail}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {invite.status === "accepted" ? "Joined" : "Invited"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
