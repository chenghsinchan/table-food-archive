import type { FoodEntry, MoodKey } from "@/types/food";

export type Mood = {
  key: MoodKey;
  name: string;
  bg: string;
  fg: string;
};

/**
 * Color = feeling. A mood tints the card back and every accent (buttons,
 * chips, toggles) while its entry is active. Values are final per the
 * design handoff — do not tweak casually.
 */
export const MOODS: Mood[] = [
  { key: "cozy", name: "Cozy", bg: "#FCC135", fg: "#2a2212" },
  { key: "comfort", name: "Comfort", bg: "#FF5846", fg: "#2e0f08" },
  { key: "fresh", name: "Fresh", bg: "#005555", fg: "#e6f2f0" },
  { key: "calm", name: "Calm", bg: "#4F77D6", fg: "#111c33" },
  { key: "sweet", name: "Sweet", bg: "#FF92AE", fg: "#3a0f1a" },
  { key: "indulgent", name: "Indulgent", bg: "#003C1E", fg: "#e8efe8" }
];

/** Neutral fallback for entries recorded before moods existed. */
export const UNSET_MOOD: Mood = { key: "cozy", name: "Memory", bg: "#e9e5db", fg: "#1a1817" };

export function moodByKey(key: MoodKey | undefined): Mood {
  return MOODS.find((mood) => mood.key === key) ?? UNSET_MOOD;
}

export function moodFor(entry: Pick<FoodEntry, "mood">): Mood {
  return moodByKey(entry.mood);
}

/** True when the entry has a real mood (not the neutral fallback). */
export function hasMood(entry: Pick<FoodEntry, "mood">): boolean {
  return Boolean(entry.mood && MOODS.some((mood) => mood.key === entry.mood));
}

/**
 * Each mood's home position on the atmosphere field (x drained→energised,
 * y vivid→soothing). Used to colour the field live as the dot moves, so the
 * one-touch stamp and the six-mood palette are the same system.
 */
const MOOD_ANCHORS: Array<{ key: MoodKey; x: number; y: number }> = [
  { key: "comfort", x: 22, y: 22 }, // vivid, lower-energy — hearty
  { key: "sweet", x: 55, y: 16 }, // vivid, playful
  { key: "fresh", x: 82, y: 26 }, // energised, bright
  { key: "calm", x: 20, y: 78 }, // soothing, quiet
  { key: "cozy", x: 50, y: 55 }, // warm centre
  { key: "indulgent", x: 82, y: 80 } // energised, rich, soothing
];

/** The mood whose home position is nearest the given atmosphere point. */
export function moodForAtmosphere(x: number, y: number): Mood {
  let nearest = MOOD_ANCHORS[0];
  let best = Infinity;

  for (const anchor of MOOD_ANCHORS) {
    const distance = (anchor.x - x) ** 2 + (anchor.y - y) ** 2;
    if (distance < best) {
      best = distance;
      nearest = anchor;
    }
  }

  return moodByKey(nearest.key);
}

/**
 * Plain-language reading of an atmosphere position, e.g. "Drained · Soothing".
 * x: 0 drained → 100 energised. y: 0 vivid → 100 soothing.
 */
export function atmosphereLabel(x: number, y: number): string {
  const horizontal = x < 40 ? "Drained" : x > 60 ? "Energised" : "";
  const vertical = y < 40 ? "Vivid" : y > 60 ? "Soothing" : "";
  const parts = [horizontal, vertical].filter(Boolean);

  return parts.length ? parts.join(" · ") : "Balanced";
}
