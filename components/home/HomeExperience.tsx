"use client";

import { useEffect, useMemo, useState } from "react";
import type { FoodEntry } from "@/types/food";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { HomeGrid } from "@/components/home/HomeGrid";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { searchEntries } from "@/lib/utils/entries";
import { applyEntryOverrides } from "@/lib/utils/local-entry-storage";

type HomeExperienceProps = {
  entries: FoodEntry[];
};

export function HomeExperience({ entries }: HomeExperienceProps) {
  const [query, setQuery] = useState("");
  const [editableEntries, setEditableEntries] = useState(entries);
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);

  useEffect(() => {
    setEditableEntries(applyEntryOverrides(entries));
  }, [entries]);

  const visibleEntries = useMemo(() => {
    return searchEntries(editableEntries, query).sort((a, b) => {
      const ratingDifference = (b.rating ?? 0) - (a.rating ?? 0);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      return new Date(`${b.entryDate}T12:00:00`).getTime() - new Date(`${a.entryDate}T12:00:00`).getTime();
    });
  }, [editableEntries, query]);

  function updateEntry(nextEntry: FoodEntry) {
    setEditableEntries((current) => current.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry)));
    setSelectedEntry(nextEntry);
  }

  function deleteEntry(entryId: string) {
    setEditableEntries((current) => current.filter((entry) => entry.id !== entryId));
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

      {visibleEntries.length ? (
        <HomeGrid
          entries={visibleEntries}
          priority
          onSelect={setSelectedEntry}
        />
      ) : (
        <EmptyState
          title="Nothing here yet"
          description="Add a meal and it will settle into the archive."
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
