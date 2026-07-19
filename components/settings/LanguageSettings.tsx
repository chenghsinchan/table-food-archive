"use client";

import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** The app-language card on the Profile page. */
export function LanguageSettings() {
  const { t } = useLanguage();

  return (
    <section className="liquid-island space-y-4 rounded-[28px] p-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("settings.language.eyebrow")}</p>
        <h2 className="font-serif text-2xl italic leading-tight text-ink">{t("settings.language.title")}</h2>
        <p className="text-sm leading-6 text-muted">{t("settings.language.sub")}</p>
      </div>
      <LanguageSelector />
    </section>
  );
}
