"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Group, GroupMember } from "@/types/food";
import { createClient } from "@/lib/supabase/client";
import {
  createGroup as createGroupInSupabase,
  getActiveGroupId,
  getGroupMembers,
  getUserGroups,
  removeMember as removeMemberInSupabase,
  setActiveGroupId as persistActiveGroupId,
  updateGroup as updateGroupInSupabase
} from "@/lib/supabase/groups";
import { ACTIVE_GROUP_STORAGE_KEY, MAX_GROUPS_PER_USER } from "@/lib/groups/constants";

type GroupContextValue = {
  groups: Group[];
  activeGroup: Group | null;
  activeGroupId: string | null;
  members: GroupMember[];
  currentUserId: string | null;
  status: "loading" | "ready" | "no-group";
  canCreateGroup: boolean;
  selectGroup: (groupId: string) => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<void>;
  updateGroup: (name: string, description?: string) => Promise<void>;
  removeMember: (memberUserId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const GroupContext = createContext<GroupContextValue | null>(null);

function readStoredActiveGroup() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeActiveGroup(groupId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (groupId) {
      window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId);
    } else {
      window.localStorage.removeItem(ACTIVE_GROUP_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [status, setStatus] = useState<GroupContextValue["status"]>("loading");
  const [userId, setUserId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    const supabase = createClient();

    if (!supabase) {
      // Local/dev with no Supabase env: behave as a single implicit space.
      setStatus("ready");
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("no-group");
      return;
    }

    setUserId(user.id);

    const nextGroups = await getUserGroups(supabase, user.id);
    setGroups(nextGroups);

    if (!nextGroups.length) {
      setActiveGroupId(null);
      setMembers([]);
      setStatus("no-group");
      return;
    }

    const stored = readStoredActiveGroup();
    const savedOnProfile = await getActiveGroupId(supabase, user.id);
    const preferred = [savedOnProfile, stored].find(
      (candidate) => candidate && nextGroups.some((group) => group.id === candidate)
    );
    const nextActiveId = preferred ?? nextGroups[0].id;

    setActiveGroupId(nextActiveId);
    storeActiveGroup(nextActiveId);
    setStatus("ready");

    try {
      setMembers(await getGroupMembers(supabase, nextActiveId));
    } catch {
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const selectGroup = useCallback(
    async (groupId: string) => {
      if (!groups.some((group) => group.id === groupId)) {
        return;
      }

      setActiveGroupId(groupId);
      storeActiveGroup(groupId);

      const supabase = createClient();
      if (supabase && userId) {
        try {
          await persistActiveGroupId(supabase, userId, groupId);
          setMembers(await getGroupMembers(supabase, groupId));
        } catch {
          // keep local selection even if persistence fails
        }
      }
    },
    [groups, userId]
  );

  const createGroup = useCallback(
    async (name: string, description?: string) => {
      const supabase = createClient();

      if (!supabase || !userId) {
        throw new Error("You need to be signed in to create a group.");
      }

      if (groups.length >= MAX_GROUPS_PER_USER) {
        throw new Error("You can only join up to 2 groups for now.");
      }

      const newGroupId = await createGroupInSupabase(supabase, userId, name, description);

      await loadGroups();

      setActiveGroupId(newGroupId);
      storeActiveGroup(newGroupId);

      try {
        await persistActiveGroupId(supabase, userId, newGroupId);
        setMembers(await getGroupMembers(supabase, newGroupId));
      } catch {
        // selection still applies locally
      }
    },
    [groups.length, userId, loadGroups]
  );

  const removeMember = useCallback(
    async (memberUserId: string) => {
      const supabase = createClient();

      if (!supabase || !activeGroupId) {
        return;
      }

      await removeMemberInSupabase(supabase, activeGroupId, memberUserId);

      if (memberUserId === userId) {
        // Removed yourself: your groups changed, so reload from scratch.
        await loadGroups();
        return;
      }

      setMembers(await getGroupMembers(supabase, activeGroupId));
    },
    [activeGroupId, userId, loadGroups]
  );

  const updateGroup = useCallback(
    async (name: string, description?: string) => {
      const supabase = createClient();

      if (!supabase || !activeGroupId) {
        throw new Error("No active group to edit.");
      }

      await updateGroupInSupabase(supabase, activeGroupId, name, description);
      await loadGroups();
    },
    [activeGroupId, loadGroups]
  );

  const value = useMemo<GroupContextValue>(() => {
    const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null;

    return {
      groups,
      activeGroup,
      activeGroupId,
      members,
      currentUserId: userId,
      status,
      canCreateGroup: groups.length < MAX_GROUPS_PER_USER,
      selectGroup,
      createGroup,
      updateGroup,
      removeMember,
      refresh: loadGroups
    };
  }, [groups, activeGroupId, members, userId, status, selectGroup, createGroup, updateGroup, removeMember, loadGroups]);

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroups() {
  const context = useContext(GroupContext);

  if (!context) {
    throw new Error("useGroups must be used inside GroupProvider.");
  }

  return context;
}
