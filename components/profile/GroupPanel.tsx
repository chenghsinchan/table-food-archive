"use client";

import { useState } from "react";
import { Check, Pencil, Plus, UserMinus, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useGroups } from "@/lib/groups/GroupProvider";
import { MAX_GROUPS_PER_USER, MAX_MEMBERS_PER_GROUP } from "@/lib/groups/constants";
import { cn } from "@/lib/utils/cn";

export function GroupPanel() {
  const { t } = useLanguage();
  const {
    groups,
    activeGroup,
    activeGroupId,
    members,
    currentUserId,
    status,
    canCreateGroup,
    selectGroup,
    createGroup,
    updateGroup,
    addMember,
    removeMember
  } = useGroups();

  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [memberEmail, setMemberEmail] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberNotice, setMemberNotice] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const groupIsFull = members.length >= MAX_MEMBERS_PER_GROUP;

  function startEditGroup() {
    setEditName(activeGroup?.name ?? "");
    setEditDescription(activeGroup?.description ?? "");
    setEditError("");
    setMemberEmail("");
    setMemberError("");
    setMemberNotice("");
    setConfirmRemoveId(null);
    setEditingGroup(true);
  }

  async function handleUpdateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError("");

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Give the archive a name.");
      return;
    }

    setEditBusy(true);

    try {
      await updateGroup(trimmed, editDescription);
      setEditingGroup(false);
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "Could not update the archive.");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleAddMember() {
    setMemberError("");
    setMemberNotice("");

    if (!memberEmail.trim()) {
      return;
    }

    setMemberBusy(true);

    try {
      await addMember(memberEmail);
      setMemberNotice("Added.");
      setMemberEmail("");
    } catch (caught) {
      setMemberError(caught instanceof Error ? caught.message : "Could not add this member.");
    } finally {
      setMemberBusy(false);
    }
  }

  async function handleRemove(memberUserId: string) {
    if (confirmRemoveId !== memberUserId) {
      setConfirmRemoveId(memberUserId);
      setMemberError("");
      return;
    }

    try {
      await removeMember(memberUserId);
      setConfirmRemoveId(null);

      if (memberUserId === currentUserId) {
        setEditingGroup(false);
      }
    } catch (caught) {
      setMemberError(caught instanceof Error ? caught.message : "Could not remove this member.");
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the archive a name.");
      return;
    }

    setBusy(true);

    try {
      await createGroup(trimmed, description);
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the archive.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <section className="liquid-island rounded-[28px] p-6">
        <p className="text-center text-sm text-muted">{t("group.loading")}</p>
      </section>
    );
  }

  return (
    <section className="liquid-island space-y-6 rounded-[28px] p-6">
      {editingGroup && activeGroup ? (
        <div className="space-y-5">
          <form onSubmit={handleUpdateGroup} className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("group.edit")}</p>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder={t("group.name.placeholder")}
              className="min-h-12 w-full rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
            />
            <input
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder={t("group.desc.placeholder")}
              className="min-h-12 w-full rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={editBusy}
                className="tap-scale flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
              >
                <Check aria-hidden="true" size={17} />
                {editBusy ? t("group.savingDots") : t("group.save")}
              </button>
              <button
                type="button"
                onClick={() => setEditingGroup(false)}
                className="tap-scale min-h-12 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
              >
                {t("common.done")}
              </button>
            </div>
            {editError ? <p className="text-sm leading-6 text-accent">{editError}</p> : null}
          </form>

          {/* ---- members: remove ---- */}
          <div className="space-y-2 border-t border-border pt-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("group.members")}</p>
            <ul className="space-y-2">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;

                return (
                  <li key={member.userId} className="flex items-center gap-3">
                    <Avatar
                      src={member.avatarUrl}
                      name={member.name}
                      initials={member.initials}
                      className="size-9 shrink-0 border border-border"
                    />
                    <span className="flex-1 truncate text-sm font-medium text-ink">
                      {member.name}
                      {isSelf ? <span className="text-muted"> {t("group.you")}</span> : null}
                    </span>
                    {member.role === "owner" ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{t("group.owner")}</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleRemove(member.userId)}
                      className={cn(
                        "tap-scale inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition",
                        confirmRemoveId === member.userId ? "bg-ink text-white" : "text-muted hover:text-ink"
                      )}
                      aria-label={isSelf ? t("group.leave") : t("group.remove")}
                    >
                      <UserMinus aria-hidden="true" size={14} />
                      {confirmRemoveId === member.userId ? (isSelf ? t("group.leaveConfirm") : t("group.removeConfirm")) : isSelf ? t("group.leave") : t("group.remove")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ---- members: add by email ---- */}
          {groupIsFull ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Users aria-hidden="true" size={15} />
              {t("group.full", { n: MAX_MEMBERS_PER_GROUP })}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("group.addMember")}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder={t("group.email.placeholder")}
                  className="min-h-12 min-w-0 flex-1 rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={memberBusy}
                  className="tap-scale flex min-h-12 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
                >
                  <UserPlus aria-hidden="true" size={15} />
                  {t("common.add")}
                </button>
              </div>
              <p className="text-xs leading-5 text-muted">{t("group.addMember.help")}</p>
            </div>
          )}
          {memberNotice ? <p className="text-sm font-medium text-muted">{memberNotice}</p> : null}
          {memberError ? <p className="text-sm leading-6 text-accent">{memberError}</p> : null}
        </div>
      ) : (
        <>
          <header className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("group.current")}</p>
              <h2 className="font-serif text-3xl italic leading-tight text-ink">{activeGroup?.name ?? t("group.none")}</h2>
              {activeGroup?.description ? <p className="text-sm leading-6 text-muted">{activeGroup.description}</p> : null}
            </div>
            {activeGroup ? (
              <button
                type="button"
                onClick={startEditGroup}
                className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-warm px-3 py-2 text-xs font-semibold text-ink"
                aria-label={t("group.edit")}
              >
                <Pencil aria-hidden="true" size={14} />
                {t("common.edit")}
              </button>
            ) : null}
          </header>

          {members.length ? (
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("group.members")}</p>
              <ul className="space-y-2">
                {members.map((member) => {
                  const isSelf = member.userId === currentUserId;

                  return (
                    <li key={member.userId} className="flex items-center gap-3">
                      <Avatar
                        src={member.avatarUrl}
                        name={member.name}
                        initials={member.initials}
                        className="size-9 shrink-0 border border-border"
                      />
                      <span className="flex-1 truncate text-sm font-medium text-ink">
                        {member.name}
                        {isSelf ? <span className="text-muted"> {t("group.you")}</span> : null}
                      </span>
                      {member.role === "owner" ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{t("group.owner")}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {groups.length > 1 ? (
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("group.switch")}</p>
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

      {/* ---- Create an archive ---- */}
      <div className="space-y-3 border-t border-border pt-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("group.create")}</p>
        {canCreateGroup ? (
          showCreate ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("group.create.name")}
                className="min-h-12 w-full rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
              />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("group.create.desc")}
                className="min-h-12 w-full rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="tap-scale flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
                >
                  <Check aria-hidden="true" size={17} />
                  {busy ? t("group.creating") : t("group.createSubmit")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                  className="tap-scale min-h-12 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
                >
                  {t("common.cancel")}
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
              {t("group.create")}
            </button>
          )
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Users aria-hidden="true" size={15} />
            {t("group.maxArchives", { n: MAX_GROUPS_PER_USER })}
          </p>
        )}
        {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}
      </div>
    </section>
  );
}
