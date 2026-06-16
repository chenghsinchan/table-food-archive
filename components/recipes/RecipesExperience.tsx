"use client";

import { useEffect, useMemo, useState } from "react";
import type { FoodEntry } from "@/types/food";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { RecipeGrid } from "@/components/recipes/RecipeGrid";
import { isRecipeCandidate } from "@/lib/utils/entries";
import { applyEntryOverrides } from "@/lib/utils/local-entry-storage";

type RecipesExperienceProps = {
  entries: FoodEntry[];
};

export function RecipesExperience({ entries }: RecipesExperienceProps) {
  const [editableEntries, setEditableEntries] = useState(entries);
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);

  useEffect(() => {
    setEditableEntries(applyEntryOverrides(entries));
  }, [entries]);

  const recipeEntries = useMemo(() => {
    return editableEntries
      .filter(isRecipeCandidate)
      .sort((a, b) => {
        const ratingDifference = (b.rating ?? 0) - (a.rating ?? 0);

        if (ratingDifference !== 0) return ratingDifference;

        return new Date(`${b.entryDate}T12:00:00`).getTime() - new Date(`${a.entryDate}T12:00:00`).getTime();
      });
  }, [editableEntries]);

  function updateEntry(nextEntry: FoodEntry) {
    setEditableEntries((current) => current.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry)));
    setSelectedEntry(nextEntry);
  }

  function deleteEntry(entryId: string) {
    setEditableEntries((current) => current.filter((entry) => entry.id !== entryId));
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

      {recipeEntries.length ? (
        <RecipeGrid entries={recipeEntries} onSelect={setSelectedEntry} />
      ) : (
        <div className="rounded-lg border border-border bg-white/72 p-8 text-center text-muted">
          Nothing matches this filter yet.
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
