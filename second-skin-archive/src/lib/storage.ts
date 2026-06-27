// localStorage-first persistence for the MVP.
// TODO(backend): swap this module for a Supabase client without touching pages.

import type { BodyProfile, ClothingItem, OutfitLog } from "@/types";

const KEYS = {
  body: "ssa.body",
  items: "ssa.items",
  logs: "ssa.logs",
  seeded: "ssa.seeded",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // localStorage quota is small; photos as data URLs can overflow it.
    console.warn("Could not persist", key, err);
  }
}

export const store = {
  // ---- body ----------------------------------------------------------
  getBody(): BodyProfile | null {
    return read<BodyProfile | null>(KEYS.body, null);
  },
  setBody(profile: BodyProfile): void {
    write(KEYS.body, profile);
  },

  // ---- clothing ------------------------------------------------------
  getItems(): ClothingItem[] {
    return read<ClothingItem[]>(KEYS.items, []);
  },
  getItem(id: string): ClothingItem | undefined {
    return store.getItems().find((i) => i.id === id);
  },
  setItems(items: ClothingItem[]): void {
    write(KEYS.items, items);
  },
  upsertItem(item: ClothingItem): void {
    const items = store.getItems();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    store.setItems(items);
  },
  removeItem(id: string): void {
    store.setItems(store.getItems().filter((i) => i.id !== id));
  },

  // ---- outfit logs ---------------------------------------------------
  getLogs(): OutfitLog[] {
    return read<OutfitLog[]>(KEYS.logs, []);
  },
  setLogs(logs: OutfitLog[]): void {
    write(KEYS.logs, logs);
  },
  addLog(log: OutfitLog): void {
    const logs = store.getLogs();
    logs.unshift(log);
    store.setLogs(logs);
    // bump worn frequency on referenced items
    const items = store.getItems();
    let changed = false;
    for (const item of items) {
      if (log.itemIds.includes(item.id)) {
        item.frequencyWorn += 1;
        changed = true;
      }
    }
    if (changed) store.setItems(items);
  },

  // ---- seed ----------------------------------------------------------
  isSeeded(): boolean {
    return read<boolean>(KEYS.seeded, false);
  },
  markSeeded(): void {
    write(KEYS.seeded, true);
  },

  reset(): void {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
