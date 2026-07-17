"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { FoodEntry } from "@/types/food";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { FirstDishEmptyState } from "@/components/home/FirstDishEmptyState";
import { HomeGrid } from "@/components/home/HomeGrid";
import { ArchivePageTabs } from "@/components/navigation/ArchivePageTabs";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GridSkeleton } from "@/components/ui/EntrySkeletons";
import { SearchBar } from "@/components/ui/SearchBar";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { searchEntries } from "@/lib/utils/entries";

export function HomeExperience() {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const { entries, status, error, upsertEntry, removeEntry } = useFoodEntries();
  const hasEntries = entries.length > 0;
  const showSkeleton = !hasEntries && status !== "error";

  useEffect(() => {
    function updateScrollState() {
      setIsScrolled(window.scrollY > 110);
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  const visibleEntries = useMemo(() => {
    return searchEntries(entries, query).sort((a, b) => {
      return new Date(`${b.entryDate}T12:00:00`).getTime() - new Date(`${a.entryDate}T12:00:00`).getTime();
    });
  }, [entries, query]);

  function updateEntry(nextEntry: FoodEntry) {
    upsertEntry(nextEntry);
    setSelectedEntry(nextEntry);
  }

  function deleteEntry(entryId: string) {
    removeEntry(entryId);
    setSelectedEntry(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 pb-10 pt-1 sm:px-6 lg:px-8">
      <header className="flex items-end justify-between gap-4 pb-3 pt-2">
        <h1 className="table-wordmark text-[44px] leading-none text-ink sm:text-[72px]">
          TABLE
        </h1>
        <div className="flex items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="tap-scale grid size-10 place-items-center rounded-[10px] text-muted hover:bg-surface-warm hover:text-ink"
            aria-expanded={searchOpen}
            aria-controls="home-search"
          >
            {searchOpen ? <X size={15} /> : <Search size={15} />}
            <span className="sr-only">Search</span>
          </button>
          <ProfileButton />
        </div>
      </header>

      <ArchivePageTabs />

      <div className="mb-6 flex justify-end pt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
        <span>{String(entries.length).padStart(2, "0")} frames</span>
      </div>

      {isScrolled && !searchOpen ? (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="fixed left-1/2 top-3 z-30 flex h-11 w-[calc(100%-1.5rem)] max-w-[1116px] -translate-x-1/2 items-center justify-between rounded-[12px] border border-white/80 bg-white/90 px-4 font-mono text-[9px] uppercase tracking-[0.16em] text-ink shadow-[0_8px_24px_rgba(26,24,23,0.14)] backdrop-blur-xl"
          aria-label="Open search"
        >
          <span>Search the archive</span>
          <Search size={15} strokeWidth={1.7} />
        </button>
      ) : null}

      {searchOpen || query ? (
        <div id="home-search" className="sticky top-3 z-30 mb-5 flex items-center gap-2 rounded-full bg-background/75 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <SearchBar value={query} onChange={setQuery} placeholder="Rainy evenings, tired, Vilnius…" />
          </div>
          <button
            type="button"
            onClick={() => { setSearchOpen(false); setQuery(""); }}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-[#fbf9f4] text-muted"
            aria-label="Close search"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {showSkeleton ? (
        <GridSkeleton />
      ) : visibleEntries.length ? (
        <HomeGrid
          entries={visibleEntries}
          onSelect={setSelectedEntry}
        />
      ) : query ? (
        <EmptyState
          title="No matches"
          description="Nothing here fits that search — try another word."
        />
      ) : (
        <FirstDishEmptyState message={error || undefined} />
      )}

      {selectedEntry ? (
        <FoodEntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
          closeOnSwipeUp
        />
      ) : null}
    </div>
  );
}
