// SECOND SKIN ARCHIVE — core data model
// Your body is your first skin. Clothing is your second skin.

/** How a garment makes you feel. Scores are 0–10. Never a "beauty" or "rating" scale. */
export interface UserFeeling {
  comfort: number;
  confidence: number;
  warmth: number;
  formality: number;
  protection: number;
  authenticity: number;
}

export type FitPreference =
  | "relaxed"
  | "regular"
  | "fitted"
  | "oversized"
  | "structured";

export interface BodyProfile {
  id: string;
  /** data URL of the uploaded full-body photo (localStorage MVP) */
  photo?: string;
  // measurements — centimetres unless noted
  heightCm: number;
  shoulderCm: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  inseamCm: number;
  torsoCm: number;
  legCm: number;
  bodyType: string;
  fitPreference: FitPreference;
  /** free, non-judgemental observations: "long torso", "gets cold easily" */
  notes: string[];
  updatedAt: string;
}

export type ClothingCategory =
  | "Tops"
  | "Bottoms"
  | "Outerwear"
  | "Shoes"
  | "Accessories";

export type Season = "Spring" | "Summer" | "Autumn" | "Winter" | "All-year";

export interface ClothingItem {
  id: string;
  photo?: string;
  name: string;
  category: ClothingCategory;
  colour: string;
  material: string;
  season: Season;
  brand: string;
  purchaseDate: string;
  notes: string;
  /** times worn — increments from the journal */
  frequencyWorn: number;
  feeling: UserFeeling;
  /** handwritten style note — "Felt safe and invisible." */
  handNote: string;
  createdAt: string;
}

export type Mood =
  | "calm"
  | "productive"
  | "social"
  | "protected"
  | "expressive"
  | "invisible"
  | "playful";

export interface OutfitLog {
  id: string;
  date: string;
  photo?: string;
  weather: string;
  location: string;
  occasion: string;
  /** ids of ClothingItem worn */
  itemIds: string[];
  mood: Mood;
  comfortScore: number;
  confidenceScore: number;
  authenticityScore: number;
  note: string;
  createdAt: string;
}

/** Fictional, for the "People Like Me" imagining surface. No real sharing yet. */
export interface SimilarProfile {
  id: string;
  name: string;
  heightRange: string;
  shoulderRange: string;
  bodyType: string;
  styleKeywords: string[];
  climate: string;
  outfitPhotos: string[];
}
