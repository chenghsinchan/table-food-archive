"use client";

import { Search, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchBar({ value, onChange, placeholder, autoFocus = false }: SearchBarProps) {
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t("search.placeholder");

  return (
    <label className="liquid-glass flex min-h-12 items-center gap-3 rounded-pill px-4 text-sm text-muted">
      <Search aria-hidden="true" size={18} strokeWidth={1.8} />
      <span className="sr-only">{resolvedPlaceholder}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={resolvedPlaceholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted/80"
        type="search"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-white/70 hover:text-ink"
          aria-label={t("search.clear")}
        >
          <X aria-hidden="true" size={16} />
        </button>
      ) : null}
    </label>
  );
}
