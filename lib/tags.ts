export const commonTags = [
  "Comfort",
  "Quick",
  "Seafood",
  "Taiwanese",
  "Japanese",
  "Lithuanian",
  "Pasta",
  "Favorite",
  "Want to recreate",
  "Restaurant",
  "Home",
  "Travel",
  "Light",
  "Rich",
  "Vegetarian",
  "Summer",
  "Winter"
];

export function canonicalTagKey(tag: string) {
  const key = tag.trim().toLowerCase().replace(/\s+/g, " ");

  if (key === "favorites") {
    return "favorite";
  }

  return key;
}

export function normalizeTagName(tag: string) {
  return tag.trim().replace(/\s+/g, " ");
}

export function uniqueTagNames(tags: string[]) {
  const byKey = new Map<string, string>();

  for (const tag of tags) {
    const name = normalizeTagName(tag);

    if (name) {
      byKey.set(canonicalTagKey(name), name);
    }
  }

  return Array.from(byKey.values());
}
