import type { FoodEntry } from "@/types/food";

const ENTRY_EDITS_KEY = "table-entry-edits";
const ENTRY_DELETIONS_KEY = "table-entry-deletions";
const LOCAL_ENTRIES_KEY = "table-local-entries";
const PLACEHOLDER_IMAGE_URL = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&h=1200&q=82";

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

export function readLocalEntries() {
  const entries = readJson<FoodEntry[]>(LOCAL_ENTRIES_KEY, []);
  const sanitized = entries.map(sanitizeStoredEntry);

  if (typeof window !== "undefined" && JSON.stringify(entries) !== JSON.stringify(sanitized)) {
    try {
      window.localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(sanitized));
    } catch {
      window.localStorage.removeItem(LOCAL_ENTRIES_KEY);
    }
  }

  return sanitized;
}

export function applyEntryOverride(entry: FoodEntry) {
  return { ...entry, ...readEntryEdits()[entry.id] };
}

export function applyEntryOverrides(entries: FoodEntry[]) {
  const edits = readEntryEdits();
  const deleted = readDeletedEntryIds();
  const seen = new Set<string>();

  return [...readLocalEntries(), ...entries]
    .filter((entry) => !deleted.has(entry.id))
    .filter((entry) => {
      if (seen.has(entry.id)) {
        return false;
      }

      seen.add(entry.id);
      return true;
    })
    .map((entry) => ({ ...entry, ...edits[entry.id] }));
}

export function storeLocalEntry(entry: FoodEntry) {
  const entries = readLocalEntries().filter((item) => item.id !== entry.id);
  window.localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify([sanitizeStoredEntry(entry), ...entries]));
}

export function clearLocalEntries() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(LOCAL_ENTRIES_KEY);
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
  const entries = readLocalEntries().filter((entry) => entry.id !== entryId);

  window.localStorage.setItem(ENTRY_DELETIONS_KEY, JSON.stringify(Array.from(deleted)));
  window.localStorage.setItem(ENTRY_EDITS_KEY, JSON.stringify(edits));
  window.localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
}

function sanitizeStoredEntry(entry: FoodEntry): FoodEntry {
  const photos = entry.photos
    .filter((photo) => !isInlineImage(photo.imageUrl))
    .map((photo) => ({
      ...photo,
      thumbnailUrl: isInlineImage(photo.thumbnailUrl) ? undefined : photo.thumbnailUrl
    }));

  return {
    ...entry,
    photos:
      photos.length > 0
        ? photos
        : [
            {
              id: `${entry.id}-placeholder`,
              imageUrl: PLACEHOLDER_IMAGE_URL,
              alt: entry.title
            }
          ]
  };
}

function isInlineImage(value?: string) {
  return Boolean(value?.startsWith("data:image"));
}
