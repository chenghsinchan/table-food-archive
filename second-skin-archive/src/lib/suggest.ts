// Rule-based outfit suggestion for the Today screen.
// Pure functions over locally-saved items — no model involved.
// TODO(ai): replace the weighting below with a learned ranker.

import type { ClothingItem, Mood, UserFeeling } from "@/types";

/**
 * For each mood we weight the six feeling dimensions. Higher weight means
 * that feeling matters more for the mood. Negative means we prefer low values.
 */
const MOOD_WEIGHTS: Record<Mood, Partial<UserFeeling>> = {
  calm: { comfort: 1, protection: 0.6, formality: -0.4 },
  productive: { confidence: 0.8, formality: 0.7, comfort: 0.5 },
  social: { confidence: 1, authenticity: 0.6, formality: 0.3 },
  protected: { protection: 1, warmth: 0.7, comfort: 0.5 },
  expressive: { authenticity: 1, confidence: 0.6, formality: -0.2 },
  invisible: { comfort: 0.8, protection: 0.6, confidence: -0.3, formality: -0.3 },
  playful: { authenticity: 0.8, confidence: 0.5, formality: -0.5 },
};

export function scoreItemForMood(item: ClothingItem, mood: Mood): number {
  const weights = MOOD_WEIGHTS[mood];
  let score = 0;
  for (const key of Object.keys(weights) as (keyof UserFeeling)[]) {
    const w = weights[key] ?? 0;
    // centre feelings around 5 so "neutral" garments don't dominate
    score += w * (item.feeling[key] - 5);
  }
  return score;
}

/**
 * Suggest one garment per layer-relevant category, picking the highest
 * scoring saved item for the chosen mood.
 */
export function suggestOutfit(
  items: ClothingItem[],
  mood: Mood,
): ClothingItem[] {
  const wanted = ["Tops", "Bottoms", "Outerwear", "Shoes"] as const;
  const picks: ClothingItem[] = [];
  for (const cat of wanted) {
    const inCat = items.filter((i) => i.category === cat);
    if (!inCat.length) continue;
    const best = inCat
      .map((i) => ({ i, s: scoreItemForMood(i, mood) }))
      .sort((a, b) => b.s - a.s)[0];
    if (best) picks.push(best.i);
  }
  return picks;
}
