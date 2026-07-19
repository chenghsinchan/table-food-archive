"use client";

import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/translations";

/**
 * Compact language picker for the Profile card — a native select so it stays
 * one row tall and uses the platform's own wheel/menu on the phone.
 */
export function LanguageDropdown() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={LOCALE_NAMES[locale]}
        className="tap-scale min-h-12 w-full appearance-none rounded-[14px] border border-border bg-[#fbf9f4] pl-4 pr-11 text-[15px] text-ink outline-none transition focus:border-ink"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_NAMES[option]}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={18}
        strokeWidth={1.8}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
