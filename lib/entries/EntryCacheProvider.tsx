"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { FoodEntry } from "@/types/food";
import { useGroups } from "@/lib/groups/GroupProvider";

type EntryCacheStatus = "idle" | "loading" | "refreshing" | "ready" | "error";

type EntryCacheContextValue = {
  entries: FoodEntry[];
  status: EntryCacheStatus;
  error: string;
  refreshEntries: (options?: { background?: boolean; force?: boolean }) => Promise<void>;
  upsertEntry: (entry: FoodEntry) => void;
  removeEntry: (entryId: string) => void;
};

const STALE_AFTER_MS = 5 * 60_000;
const ALL_KEY = "__all__";

type GroupCache = { entries: FoodEntry[]; fetchedAt: number };

// Entries are cached per active group so switching groups is instant and never
// leaks one group's entries into another.
const cacheByGroup = new Map<string, GroupCache>();
const inFlightByGroup = new Map<string, Promise<FoodEntry[]>>();

const EntryCacheContext = createContext<EntryCacheContextValue | null>(null);

async function fetchEntries(groupId: string | null) {
  const key = groupId ?? ALL_KEY;

  if (!inFlightByGroup.has(key)) {
    const url = groupId ? `/api/entries?group=${encodeURIComponent(groupId)}` : "/api/entries";
    const request = fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not refresh TABLE entries.");
        }

        return response.json() as Promise<FoodEntry[]>;
      })
      .finally(() => {
        inFlightByGroup.delete(key);
      });

    inFlightByGroup.set(key, request);
  }

  return inFlightByGroup.get(key)!;
}

export function EntryCacheProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeGroupId, status: groupStatus } = useGroups();
  const groupKey = activeGroupId ?? ALL_KEY;

  const [entries, setEntries] = useState<FoodEntry[]>(() => cacheByGroup.get(groupKey)?.entries ?? []);
  const [status, setStatus] = useState<EntryCacheStatus>(cacheByGroup.get(groupKey)?.entries.length ? "ready" : "idle");
  const [error, setError] = useState("");

  const refreshEntries = useCallback(
    async (options: { background?: boolean; force?: boolean } = {}) => {
      const cached = cacheByGroup.get(groupKey);
      const hasEntries = (cached?.entries.length ?? 0) > 0;
      const isFresh = cached ? Date.now() - cached.fetchedAt < STALE_AFTER_MS : false;

      if (!options.force && hasEntries && isFresh) {
        setEntries(cached!.entries);
        setStatus("ready");
        return;
      }

      setStatus(options.background || hasEntries ? "refreshing" : "loading");
      setError("");

      try {
        const nextEntries = await fetchEntries(activeGroupId ?? null);
        cacheByGroup.set(groupKey, { entries: nextEntries, fetchedAt: Date.now() });
        setEntries(nextEntries);
        setStatus("ready");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not refresh TABLE entries.");
        setStatus(hasEntries ? "ready" : "error");
      }
    },
    [groupKey, activeGroupId]
  );

  // Load (or swap to) the active group's entries whenever the active group changes.
  useEffect(() => {
    if (groupStatus === "loading") {
      return;
    }

    const cached = cacheByGroup.get(groupKey);
    setEntries(cached?.entries ?? []);
    setStatus(cached?.entries.length ? "ready" : "idle");
    refreshEntries({ background: (cached?.entries.length ?? 0) > 0 });
  }, [groupKey, groupStatus, refreshEntries]);

  // Soft refresh when returning to a main tab and the cache is stale.
  useEffect(() => {
    if (!["/", "/tonight", "/love"].includes(pathname)) {
      return;
    }

    const cached = cacheByGroup.get(groupKey);
    if (cached?.entries.length && Date.now() - cached.fetchedAt >= STALE_AFTER_MS) {
      refreshEntries({ background: true });
    }
  }, [pathname, groupKey, refreshEntries]);

  const value = useMemo<EntryCacheContextValue>(
    () => ({
      entries,
      status,
      error,
      refreshEntries,
      upsertEntry(entry) {
        const cached = cacheByGroup.get(groupKey);
        const nextEntries = [entry, ...(cached?.entries ?? []).filter((candidate) => candidate.id !== entry.id)];
        cacheByGroup.set(groupKey, { entries: nextEntries, fetchedAt: cached?.fetchedAt ?? Date.now() });
        setEntries(nextEntries);
        setStatus("ready");
      },
      removeEntry(entryId) {
        const cached = cacheByGroup.get(groupKey);
        const nextEntries = (cached?.entries ?? []).filter((entry) => entry.id !== entryId);
        cacheByGroup.set(groupKey, { entries: nextEntries, fetchedAt: cached?.fetchedAt ?? Date.now() });
        setEntries(nextEntries);
        setStatus("ready");
      }
    }),
    [entries, status, error, refreshEntries, groupKey]
  );

  return <EntryCacheContext.Provider value={value}>{children}</EntryCacheContext.Provider>;
}

export function useFoodEntries() {
  const context = useContext(EntryCacheContext);

  if (!context) {
    throw new Error("useFoodEntries must be used inside EntryCacheProvider.");
  }

  return context;
}
