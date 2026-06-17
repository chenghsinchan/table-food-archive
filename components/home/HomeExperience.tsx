"use client";

import { useMemo, useState } from "react";
import type { FoodEntry } from "@/types/food";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { HomeGrid } from "@/components/home/HomeGrid";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GridSkeleton } from "@/components/ui/EntrySkeletons";
import { SearchBar } from "@/components/ui/SearchBar";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { searchEntries } from "@/lib/utils/entries";

export function HomeExperience() {
  const [query, setQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const { entries, status, error, upsertEntry, removeEntry } = useFoodEntries();
  const hasEntries = entries.length > 0;
  const showSkeleton = !hasEntries && status !== "error";

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
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-1 sm:px-6 lg:px-8">
      <header className="flex items-end justify-between gap-4 pb-5 pt-2">
        <h1 className="table-wordmark text-[58px] leading-none text-ink sm:text-[86px]">
          TABLE
        </h1>
        <div className="flex items-center pb-1">
          <ProfileButton />
        </div>
      </header>

      <div className="sticky top-3 z-20 pb-6">
        <SearchBar value={query} onChange={setQuery} placeholder="Search TABLE" />
      </div>

      {showSkeleton ? (
        <GridSkeleton />
      ) : visibleEntries.length ? (
        <HomeGrid
          entries={visibleEntries}
          onSelect={setSelectedEntry}
        />
      ) : (
        <EmptyState
          title="Nothing here yet"
          description={error || "Add a meal and it will settle into the archive."}
        />
      )}

      {selectedEntry ? (
        <FoodEntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
        />
      ) : null}
    </div>
  );
}
