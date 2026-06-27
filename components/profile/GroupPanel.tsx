"use client";

import { useState } from "react";
import { Check, Plus, Users } from "lucide-react";
import { useGroups } from "@/lib/groups/GroupProvider";
import { cn } from "@/lib/utils/cn";

export function GroupPanel() {
  const { groups, activeGroup, activeGroupId, members, status, canCreateGroup, selectGroup, createGroup } = useGroups();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") {
    return (
      <section className="liquid-island rounded-[28px] p-6">
        <p className="text-center text-sm text-muted">Loading your group…</p>
      </section>
    );
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the group a name.");
      return;
    }

    setBusy(true);

    try {
      await createGroup(trimmed, description);
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="liquid-island space-y-6 rounded-[28px] p-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Current group</p>
        <h2 className="font-serif text-3xl italic leading-tight text-ink">{activeGroup?.name ?? "No group yet"}</h2>
        {activeGroup?.description ? <p className="text-sm leading-6 text-muted">{activeGroup.description}</p> : null}
      </header>

      {members.length ? (
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Members</p>
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white text-xs font-semibold text-ink">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" loading="lazy" className="size-full object-cover" />
                  ) : (
                    member.initials
                  )}
                </span>
                <span className="text-sm font-medium text-ink">{member.name}</span>
                {member.role === "owner" ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Owner</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {groups.length > 1 ? (
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Switch group</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => selectGroup(group.id)}
                className={cn(
                  "tap-scale rounded-full border px-4 py-2 text-sm font-semibold transition",
                  group.id === activeGroupId
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-white text-ink hover:border-ink"
                )}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-border pt-5">
        {canCreateGroup ? (
          showCreate ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-muted">Group name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Dinner Club"
                  className="min-h-12 rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-muted">Description (optional)</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Friends who cook together"
                  className="min-h-12 rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="tap-scale flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
                >
                  <Check aria-hidden="true" size={17} />
                  {busy ? "Creating…" : "Create group"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                  className="tap-scale min-h-12 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
            >
              <Plus aria-hidden="true" size={17} />
              Add group
            </button>
          )
        ) : (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-muted">
            <Users aria-hidden="true" size={15} />
            You can only join up to 2 groups for now.
          </p>
        )}
        {error ? <p className="mt-3 text-center text-sm leading-6 text-accent">{error}</p> : null}
      </div>
    </section>
  );
}
