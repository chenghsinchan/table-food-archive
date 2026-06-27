"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Group, GroupMember } from "@/types/food";
import { createClient } from "@/lib/supabase/client";
import {
  getActiveGroupId,
  getGroupMembers,
  getUserGroups,
  setActiveGroupId as persistActiveGroupId
} from "@/lib/supabase/groups";
import { ACTIVE_GROUP_STORAGE_KEY } from "@/lib/groups/constants";

type GroupContextValue = {
  groups: Group[];
  activeGroup: Group | null;
  activeGroupId: string | null;
  members: GroupMember[];
  status: "loading" | "ready" | "no-group";
  selectGroup: (groupId: string) => Promise<void>;
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

  const value = useMemo<GroupContextValue>(() => {
    const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null;

    return {
      groups,
      activeGroup,
      activeGroupId,
      members,
      status,
      selectGroup,
      refresh: loadGroups
    };
  }, [groups, activeGroupId, members, status, selectGroup, loadGroups]);

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroups() {
  const context = useContext(GroupContext);

  if (!context) {
    throw new Error("useGroups must be used inside GroupProvider.");
  }

  return context;
}
