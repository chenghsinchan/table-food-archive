"use client";

import { useMemo, useState } from "react";
import type { FoodEntry } from "@/types/food";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { RecipeGrid } from "@/components/recipes/RecipeGrid";
import { CoverSkeleton } from "@/components/ui/EntrySkeletons";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { createClient } from "@/lib/supabase/client";
import { setEntryLovedInSupabase } from "@/lib/supabase/save-entry";

export function RecipesExperience() {
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const [entryToRemove, setEntryToRemove] = useState<FoodEntry | null>(null);
  const [removeError, setRemoveError] = useState("");
  const { entries, status, error, upsertEntry, removeEntry: removeCachedEntry } = useFoodEntries();
  const showSkeleton = !entries.length && status !== "error";

  const recipeEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.isLoved)
      .sort((a, b) => {
        return new Date(`${b.entryDate}T12:00:00`).getTime() - new Date(`${a.entryDate}T12:00:00`).getTime();
      });
  }, [entries]);

  function updateEntry(nextEntry: FoodEntry) {
    upsertEntry(nextEntry);
    setSelectedEntry(nextEntry);
  }

  function deleteEntry(entryId: string) {
    removeCachedEntry(entryId);
    setSelectedEntry(null);
  }

  async function removeFromLove() {
    if (!entryToRemove) {
      return;
    }

    setRemoveError("");

    try {
      const supabase = createClient();

      if (supabase) {
        await setEntryLovedInSupabase(supabase, entryToRemove.id, false);
      }

      upsertEntry({ ...entryToRemove, isLoved: false });
      setEntryToRemove(null);
    } catch (caught) {
      setRemoveError(caught instanceof Error ? caught.message : "Could not remove this from LOVE.");
    }
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
        <RecipeGrid entries={recipeEntries} onSelect={setSelectedEntry} onRequestRemove={setEntryToRemove} />
      ) : (
        <div className="rounded-lg border border-border bg-white/72 p-8 text-center text-muted">
          {error || "LOVE is empty. Save cards from TONIGHT with the heart."}
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

      {entryToRemove ? (
        <div className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-sm rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-base font-semibold text-ink">Remove from LOVE?</p>
          <p className="mt-1 text-sm leading-6 text-muted">{entryToRemove.title} will stay in HOME.</p>
          {removeError ? <p className="mt-2 text-sm text-ink">{removeError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEntryToRemove(null)} className="rounded-full bg-surface-warm px-4 py-2 text-sm font-semibold text-ink">
              Cancel
            </button>
            <button type="button" onClick={removeFromLove} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
