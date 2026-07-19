"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils/cn";

/**
 * The three languages, each labelled in its own script, with the active one
 * ticked. Shared by the Profile setting (stacked list) and the onboarding intro
 * (compact centred row) so switching language looks the same everywhere.
 */
export function LanguageSelector({ layout = "stack", className }: { layout?: "stack" | "row"; className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className={cn(layout === "row" ? "flex flex-wrap justify-center gap-2" : "grid gap-2", className)}>
      {LOCALES.map((option) => {
        const active = option === locale;

        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            className={cn(
              "tap-scale flex items-center gap-1.5 border transition-colors",
              layout === "row"
                ? "min-h-9 rounded-full px-3.5 text-[12px]"
                : "min-h-12 justify-between rounded-[14px] px-4 text-[15px]",
              active
                ? "border-ink bg-ink text-[#fbf9f4]"
                : "border-border bg-[#fbf9f4] text-ink hover:border-ink/40"
            )}
          >
            {LOCALE_NAMES[option]}
            {active ? <Check aria-hidden="true" size={layout === "row" ? 13 : 16} strokeWidth={2} /> : null}
          </button>
        );
      })}
    </div>
  );
}
