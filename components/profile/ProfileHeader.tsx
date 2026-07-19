"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** TABLE wordmark + quiet Back link + translated section label. */
export function ProfileHeader() {
  const { t } = useLanguage();

  return (
    <header className="pb-5 pt-2">
      <div className="flex items-end justify-between gap-4">
        <h1 className="table-wordmark text-[44px] leading-none text-ink sm:text-[72px]">TABLE</h1>
        <Link
          href="/"
          aria-label={t("common.back")}
          className="tap-scale mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.8} />
          {t("common.back")}
        </Link>
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{t("profile.title")}</p>
    </header>
  );
}
