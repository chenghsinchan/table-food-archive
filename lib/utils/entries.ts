import type { EntryContributor, FoodEntry } from "@/types/food";
import { formatMonth } from "@/lib/utils/date";

export function entryTypeLabel(entry: FoodEntry) {
  if (entry.type === "home") return "Home";
  if (entry.type === "restaurant") return "Restaurant";
  if (entry.type === "travel") return "Travel";
  return "Recipe";
}

export function entryLocation(entry: FoodEntry) {
  if (entry.restaurantName && entry.city) {
    return `${entry.restaurantName}, ${entry.city}`;
  }

  if (entry.city && entry.type === "home") {
    return `${entry.city}, home`;
  }

  return [entry.city, entry.country].filter(Boolean).join(", ") || entryTypeLabel(entry);
}

export function entryContributor(entry: FoodEntry): EntryContributor {
  if (entry.addedBy) {
    return entry.addedBy;
  }

  const cheng = entry.id.charCodeAt(0) % 2 === 0;

  return cheng ? { name: "Cheng", initials: "C" } : { name: "Saulė", initials: "S" };
}

export function hasTag(entry: FoodEntry, tag: string) {
  const wanted = tag.toLowerCase();

  return entry.tags.some((candidate) => {
    const normalized = candidate.toLowerCase();

    if (wanted === "favorite") {
      return normalized === "favorite" || normalized === "favorites";
    }

    if (wanted === "pasta") {
      return normalized === "pasta" || normalized === "italian";
    }

    return normalized === wanted;
  });
}

export function isRecipeCandidate(entry: FoodEntry) {
  if (entry.type === "restaurant" || entry.type === "travel") {
    return Boolean(entry.wantToRecreate);
  }

  return entry.type === "home" || entry.type === "recipe" || Boolean(entry.recipe);
}

export function searchEntries(entries: FoodEntry[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return entries;
  }

  return entries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.restaurantName,
      entry.city,
      entry.country,
      entry.notes,
      entry.recipe,
      entryTypeLabel(entry),
      entry.wantToRecreate ? "want to recreate" : "",
      entry.addedBy?.name,
      ...entry.tags
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function groupEntriesByMonth(entries: FoodEntry[]) {
  return entries.reduce<Array<{ month: string; entries: FoodEntry[] }>>((groups, entry) => {
    const month = formatMonth(entry.entryDate);
    const existing = groups.find((group) => group.month === month);

    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.push({ month, entries: [entry] });
    }

    return groups;
  }, []);
}
