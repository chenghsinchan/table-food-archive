import type { FoodEntry } from "@/types/food";

const ENTRY_EDITS_KEY = "table-entry-edits";
const ENTRY_DELETIONS_KEY = "table-entry-deletions";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readEntryEdits() {
  return readJson<Record<string, Partial<FoodEntry>>>(ENTRY_EDITS_KEY, {});
}

export function readDeletedEntryIds() {
  return new Set(readJson<string[]>(ENTRY_DELETIONS_KEY, []));
}

export function applyEntryOverride(entry: FoodEntry) {
  return { ...entry, ...readEntryEdits()[entry.id] };
}

export function applyEntryOverrides(entries: FoodEntry[]) {
  const edits = readEntryEdits();
  const deleted = readDeletedEntryIds();

  return entries
    .filter((entry) => !deleted.has(entry.id))
    .map((entry) => ({ ...entry, ...edits[entry.id] }));
}

export function storeEntryEdit(entry: FoodEntry) {
  const edits = readEntryEdits();
  edits[entry.id] = {
    title: entry.title,
    rating: entry.rating,
    notes: entry.notes,
    recipe: entry.recipe
  };
  window.localStorage.setItem(ENTRY_EDITS_KEY, JSON.stringify(edits));
}

export function storeEntryDeletion(entryId: string) {
  const deleted = readDeletedEntryIds();
  deleted.add(entryId);

  const edits = readEntryEdits();
  delete edits[entryId];

  window.localStorage.setItem(ENTRY_DELETIONS_KEY, JSON.stringify(Array.from(deleted)));
  window.localStorage.setItem(ENTRY_EDITS_KEY, JSON.stringify(edits));
}
