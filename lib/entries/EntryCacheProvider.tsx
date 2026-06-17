"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { FoodEntry } from "@/types/food";

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

let cachedEntries: FoodEntry[] = [];
let lastFetchedAt = 0;
let inFlightRequest: Promise<FoodEntry[]> | null = null;

const EntryCacheContext = createContext<EntryCacheContextValue | null>(null);

async function fetchEntries() {
  if (!inFlightRequest) {
    inFlightRequest = fetch("/api/entries", {
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
        inFlightRequest = null;
      });
  }

  return inFlightRequest;
}

export function EntryCacheProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [entries, setEntries] = useState(cachedEntries);
  const [status, setStatus] = useState<EntryCacheStatus>(cachedEntries.length ? "ready" : "idle");
  const [error, setError] = useState("");
  const mountedRef = useRef(false);

  const refreshEntries = useCallback(async (options: { background?: boolean; force?: boolean } = {}) => {
    const hasEntries = cachedEntries.length > 0;
    const isFresh = Date.now() - lastFetchedAt < STALE_AFTER_MS;

    if (!options.force && hasEntries && isFresh) {
      setEntries(cachedEntries);
      setStatus("ready");
      return;
    }

    setStatus(options.background || hasEntries ? "refreshing" : "loading");
    setError("");

    try {
      const nextEntries = await fetchEntries();
      cachedEntries = nextEntries;
      lastFetchedAt = Date.now();
      setEntries(nextEntries);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh TABLE entries.");
      setStatus(hasEntries ? "ready" : "error");
    }
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      return;
    }

    mountedRef.current = true;
    refreshEntries({ background: cachedEntries.length > 0 });
  }, [refreshEntries]);

  useEffect(() => {
    if (!["/", "/tonight", "/love"].includes(pathname)) {
      return;
    }

    if (cachedEntries.length && Date.now() - lastFetchedAt >= STALE_AFTER_MS) {
      refreshEntries({ background: true });
    }
  }, [pathname, refreshEntries]);

  const value = useMemo<EntryCacheContextValue>(() => ({
    entries,
    status,
    error,
    refreshEntries,
    upsertEntry(entry) {
      cachedEntries = [entry, ...cachedEntries.filter((candidate) => candidate.id !== entry.id)];
      setEntries(cachedEntries);
      setStatus("ready");
    },
    removeEntry(entryId) {
      cachedEntries = cachedEntries.filter((entry) => entry.id !== entryId);
      setEntries(cachedEntries);
      setStatus("ready");
    }
  }), [entries, error, refreshEntries, status]);

  return <EntryCacheContext.Provider value={value}>{children}</EntryCacheContext.Provider>;
}

export function useFoodEntries() {
  const context = useContext(EntryCacheContext);

  if (!context) {
    throw new Error("useFoodEntries must be used inside EntryCacheProvider.");
  }

  return context;
}
