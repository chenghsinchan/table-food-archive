"use client";

import { useMemo, useState } from "react";
import type { FoodEntry } from "@/types/food";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { RecipeGrid } from "@/components/recipes/RecipeGrid";
import { CoverSkeleton } from "@/components/ui/EntrySkeletons";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { isRecipeCandidate } from "@/lib/utils/entries";

export function RecipesExperience() {
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const { entries, status, error, upsertEntry, removeEntry } = useFoodEntries();
  const showSkeleton = !entries.length && status !== "error";

  const recipeEntries = useMemo(() => {
    return entries
      .filter(isRecipeCandidate)
      .sort((a, b) => {
        const ratingDifference = (b.rating ?? 0) - (a.rating ?? 0);

        if (ratingDifference !== 0) return ratingDifference;

        return new Date(`${b.entryDate}T12:00:00`).getTime() - new Date(`${a.entryDate}T12:00:00`).getTime();
      });
  }, [entries]);

  function updateEntry(nextEntry: FoodEntry) {
    upsertEntry(nextEntry);
    setSelectedEntry(nextEntry);
  }

  function deleteEntry(entryId: string) {
    removeEntry(entryId);
    setSelectedEntry(null);
  }

  return (
    <div className="relative isolate mx-auto flex h-full w-full max-w-[1120px] flex-col overflow-hidden px-4 pt-1 before:fixed before:inset-0 before:-z-10 before:bg-background sm:px-6 lg:px-8">
      <header className="flex shrink-0 items-end justify-between gap-4 pb-4 pt-2">
        <h1 className="table-wordmark text-[58px] leading-none text-ink sm:text-[86px]">
          TABLE
        </h1>
        <div className="flex items-center pb-1">
          <ProfileButton />
        </div>
      </header>

      {showSkeleton ? (
        <CoverSkeleton />
      ) : recipeEntries.length ? (
        <RecipeGrid entries={recipeEntries} onSelect={setSelectedEntry} />
      ) : (
        <div className="rounded-lg border border-border bg-white/72 p-8 text-center text-muted">
          {error || "Nothing matches this filter yet."}
        </div>
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
