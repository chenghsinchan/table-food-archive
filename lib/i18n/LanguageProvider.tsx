"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_TAGS,
  TRANSLATIONS,
  type Locale,
  type TranslationKey
} from "@/lib/i18n/translations";

const STORAGE_KEY = "table-language-v1";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return Boolean(value) && (LOCALES as readonly string[]).includes(value as string);
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start on the default so server and first client render match (html lang="en"),
  // then adopt the stored choice after mount to avoid a hydration mismatch.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = LOCALE_TAGS[locale];
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures — the choice still applies for this session
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => TRANSLATIONS[locale][key] ?? TRANSLATIONS[DEFAULT_LOCALE][key] ?? key,
    [locale]
  );

  const value = useMemo<LanguageContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
