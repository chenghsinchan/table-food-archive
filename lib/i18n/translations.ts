/**
 * App-wide language system. Three locales, English is the default and the
 * source of truth: every other locale is checked against `en`'s keys at build
 * time, and any missing string falls back to English at runtime.
 */

export const LOCALES = ["en", "zh-TW", "lt"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language is always labelled in its own script, in every locale. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  "zh-TW": "中文（台灣繁體）",
  lt: "Lietuvių"
};

/** BCP-47 tag for <html lang> and Intl. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  "zh-TW": "zh-Hant-TW",
  lt: "lt"
};

const en = {
  "common.back": "Back",
  "common.continue": "Continue",
  "common.skip": "Skip",

  "nav.home": "Home",
  "nav.sunday": "Sunday",
  "nav.add": "Add a food memory",

  "profile.title": "Profile",

  "settings.language.eyebrow": "Language",
  "settings.language.title": "Choose your language",
  "settings.language.sub": "Set the language for the whole app. You can change it anytime.",

  "onboarding.welcome.tagline": "A quiet place to keep what you taste, where you were, and how it felt.",
  "onboarding.begin": "Begin",
  "onboarding.language": "Language",
  "onboarding.flip.title": "Tap a memory to turn it over.",
  "onboarding.flip.sub": "Every entry hides its mood on the back.",
  "onboarding.flip.tap": "Tap the card",
  "onboarding.flip.done": "Nicely done",
  "onboarding.atmosphere.title": "One tap says more than words.",
  "onboarding.atmosphere.sub": "Drag the dot to record the mood — no writing required."
} as const;

export type TranslationKey = keyof typeof en;

/** Every locale must cover the full English key set (enforced by the type). */
type Dictionary = Record<TranslationKey, string>;

const zhTW: Dictionary = {
  "common.back": "返回",
  "common.continue": "繼續",
  "common.skip": "略過",

  "nav.home": "首頁",
  "nav.sunday": "週日",
  "nav.add": "新增食物回憶",

  "profile.title": "個人檔案",

  "settings.language.eyebrow": "語言",
  "settings.language.title": "選擇你的語言",
  "settings.language.sub": "設定整個 App 的語言，隨時都能更改。",

  "onboarding.welcome.tagline": "一個安靜的角落，收藏你嚐過的味道、去過的地方，還有當下的心情。",
  "onboarding.begin": "開始",
  "onboarding.language": "語言",
  "onboarding.flip.title": "輕觸回憶，把它翻過來。",
  "onboarding.flip.sub": "每則紀錄的背面都藏著它的心情。",
  "onboarding.flip.tap": "輕觸卡片",
  "onboarding.flip.done": "做得好",
  "onboarding.atmosphere.title": "一次輕觸，勝過千言萬語。",
  "onboarding.atmosphere.sub": "拖曳圓點記錄心情——不用打字。"
};

const lt: Dictionary = {
  "common.back": "Atgal",
  "common.continue": "Tęsti",
  "common.skip": "Praleisti",

  "nav.home": "Pradžia",
  "nav.sunday": "Sekmadienis",
  "nav.add": "Pridėti maisto prisiminimą",

  "profile.title": "Profilis",

  "settings.language.eyebrow": "Kalba",
  "settings.language.title": "Pasirinkite kalbą",
  "settings.language.sub": "Nustatykite visos programėlės kalbą. Galite pakeisti bet kada.",

  "onboarding.welcome.tagline": "Rami vieta, kur išsaugoti tai, ką ragavai, kur buvai ir kaip jauteisi.",
  "onboarding.begin": "Pradėti",
  "onboarding.language": "Kalba",
  "onboarding.flip.title": "Palieskite prisiminimą, kad jį apverstumėte.",
  "onboarding.flip.sub": "Kiekvienas įrašas kitoje pusėje slepia savo nuotaiką.",
  "onboarding.flip.tap": "Palieskite kortelę",
  "onboarding.flip.done": "Puiku",
  "onboarding.atmosphere.title": "Vienas prisilietimas pasako daugiau nei žodžiai.",
  "onboarding.atmosphere.sub": "Vilkite tašką, kad užfiksuotumėte nuotaiką — rašyti nereikia."
};

export const TRANSLATIONS: Record<Locale, Dictionary> = {
  en,
  "zh-TW": zhTW,
  lt
};
