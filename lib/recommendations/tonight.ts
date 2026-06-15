import type { FoodEntry } from "@/types/food";
import { daysSince } from "@/lib/utils/date";
import { hasTag, isRecipeCandidate } from "@/lib/utils/entries";

const moodTags: Record<string, string[]> = {
  Comfort: ["Comfort", "Taiwanese", "Italian", "Lithuanian"],
  Quick: ["Quick", "Breakfast"],
  Light: ["Light", "Vegetarian", "Seafood"],
  Rich: ["Rich", "Comfort"],
  Seafood: ["Seafood"],
  Vegetarian: ["Vegetarian"],
  "Surprise me": []
};

function seasonalBoost(entry: FoodEntry) {
  const month = new Date().getMonth() + 1;
  const summer = month >= 5 && month <= 8;
  const winter = month === 12 || month <= 2;

  if (summer && entry.tags.includes("Summer")) return 8;
  if (winter && entry.tags.includes("Winter")) return 8;
  return 0;
}

export function recommendTonight(entries: FoodEntry[], mood: string, offset = 0) {
  const tags = moodTags[mood] ?? [];
  const surprise = mood === "Surprise me";

  return entries
    .filter((entry) => {
      if (isRecipeCandidate(entry)) return true;
      if (surprise) return true;

      return tags.some((tag) => hasTag(entry, tag));
    })
    .map((entry) => {
      const ratingScore = (entry.rating ?? 3) * 32;
      const recencyScore = Math.min(daysSince(entry.entryDate), 365) / 4;
      const tagScore = tags.length ? tags.filter((tag) => hasTag(entry, tag)).length * 34 : 16;
      const kitchenScore = entry.type === "home" || entry.type === "recipe" ? 26 : 0;
      const recreateScore = entry.wantToRecreate ? 18 : 0;
      const recipeScore = entry.recipe ? 10 : 0;
      const inspirationPenalty = !isRecipeCandidate(entry) ? -34 : 0;
      const freshnessNoise = ((entry.id.charCodeAt(0) + offset * 17) % 11) * 1.2;

      return {
        entry,
        score:
          ratingScore +
          recencyScore +
          tagScore +
          kitchenScore +
          recreateScore +
          recipeScore +
          seasonalBoost(entry) +
          inspirationPenalty +
          freshnessNoise
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(offset % 3, offset % 3 + 5)
    .map(({ entry }) => entry);
}
