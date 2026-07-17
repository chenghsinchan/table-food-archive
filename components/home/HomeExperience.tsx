"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { FoodEntry } from "@/types/food";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { FirstDishEmptyState } from "@/components/home/FirstDishEmptyState";
import { HomeGrid } from "@/components/home/HomeGrid";
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
      setIsScrolled(window.scrollY > 140);
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
      <header className="flex items-end justify-between gap-4 pb-5 pt-2">
        <h1 className="table-wordmark text-[44px] leading-none text-ink sm:text-[72px]">
          TABLE
        </h1>
        <div className="flex items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="tap-scale grid size-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-expanded={searchOpen}
            aria-label="Search the archive"
          >
            <Search size={17} strokeWidth={1.7} />
          </button>
          <ProfileButton />
        </div>
      </header>

      {/* Same pill, same shape, width of the nav island. Fixed at the top once
          you scroll; in-flow when opened from the header icon. */}
      {isScrolled ? (
        <div className="fixed left-1/2 top-3 z-30 w-[292px] -translate-x-1/2">
          <SearchBar value={query} onChange={setQuery} placeholder="Warm evenings, relaxed, London." />
        </div>
      ) : searchOpen || query ? (
        <div className="mx-auto mb-5 w-[292px]">
          <SearchBar value={query} onChange={setQuery} placeholder="Warm evenings, relaxed, London." autoFocus />
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
