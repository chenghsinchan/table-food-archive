// Placeholder "AI" layer. None of this calls a model yet — every function
// returns deterministic / mock data so the UI can be built end-to-end.
//
// TODO(ai): AI body measurement detection — feed the uploaded full-body photo
//   to a pose/segmentation model and return real measurements + confidence.
// TODO(ai): AI clothing recognition — auto-fill category / colour / material
//   from a garment photo.
// TODO(weather): weather API — resolve location + date to conditions for the
//   outfit journal and the Today suggestions.

import type { BodyProfile, FitPreference } from "@/types";
import { uid } from "./storage";

const BODY_TYPES = [
  "rectangle",
  "triangle",
  "inverted triangle",
  "oval",
  "hourglass",
];

const FIT_PREFS: FitPreference[] = [
  "relaxed",
  "regular",
  "fitted",
  "oversized",
  "structured",
];

function jitter(base: number, spread: number): number {
  return Math.round(base + (Math.random() * 2 - 1) * spread);
}

/**
 * Mock body detection. Pretends to analyse `photo` and returns a plausible,
 * fully-editable measurement set. Replace with a real model later.
 */
export function detectBodyFromPhoto(photo?: string): BodyProfile {
  const height = jitter(170, 12);
  return {
    id: uid(),
    photo,
    heightCm: height,
    shoulderCm: jitter(42, 4),
    chestCm: jitter(92, 8),
    waistCm: jitter(76, 8),
    hipsCm: jitter(96, 8),
    inseamCm: jitter(78, 6),
    torsoCm: jitter(46, 4),
    legCm: Math.round(height * 0.47),
    bodyType: BODY_TYPES[Math.floor(Math.random() * BODY_TYPES.length)],
    fitPreference: FIT_PREFS[Math.floor(Math.random() * FIT_PREFS.length)],
    notes: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Reads an uploaded File into a data URL for localStorage preview. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
