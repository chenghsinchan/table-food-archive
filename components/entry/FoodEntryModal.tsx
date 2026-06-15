"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Check, Pencil, Star, Trash2, X } from "lucide-react";
import type { FoodEntry } from "@/types/food";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatLongDate } from "@/lib/utils/date";
import { entryLocation, entryTypeLabel } from "@/lib/utils/entries";
import { storeEntryDeletion, storeEntryEdit } from "@/lib/utils/local-entry-storage";

type FoodEntryModalProps = {
  entry: FoodEntry;
  onClose: () => void;
  onUpdate?: (entry: FoodEntry) => void;
  onDelete?: (entryId: string) => void;
};

type DraftEntry = {
  title: string;
  rating: number;
  notes: string;
  recipe: string;
};

function CompactStars({
  value,
  editable,
  onChange
}: {
  value: number;
  editable?: boolean;
  onChange?: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={value ? `${value} out of 5 stars` : "No rating"}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const starIcon = (
          <Star
            aria-hidden="true"
            size={17}
            fill={filled ? "currentColor" : "none"}
            strokeWidth={2.2}
            className={cn(filled ? "text-ink" : "text-ink/25", "drop-shadow-none")}
          />
        );

        if (!editable) {
          return <span key={star} className="grid size-5 place-items-center">{starIcon}</span>;
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="tap-scale grid size-7 place-items-center rounded-full hover:bg-surface-warm"
            aria-label={`Rate ${star} out of 5`}
          >
            {starIcon}
          </button>
        );
      })}
    </div>
  );
}

export function FoodEntryModal({ entry, onClose, onUpdate, onDelete }: FoodEntryModalProps) {
  const photo = entry.photos[0];
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftEntry>({
    title: entry.title,
    rating: entry.rating ?? 0,
    notes: entry.notes ?? "",
    recipe: entry.recipe ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  async function saveEdit() {
    setError("");
    setSaving(true);

    try {
      const nextEntry: FoodEntry = {
        ...entry,
        title: draft.title.trim() || entry.title,
        rating: draft.rating || undefined,
        notes: draft.notes.trim() || undefined,
        recipe: draft.recipe.trim() || undefined
      };

      const supabase = createClient();
      if (supabase) {
        const { error: updateError } = await supabase
          .from("food_entries")
          .update({
            title: nextEntry.title,
            rating: nextEntry.rating ?? null,
            notes: nextEntry.notes ?? null,
            recipe: nextEntry.recipe ?? null,
            updated_at: new Date().toISOString()
          })
          .eq("id", entry.id);

        if (updateError) {
          throw updateError;
        }
      }

      storeEntryEdit(nextEntry);
      onUpdate?.(nextEntry);
      setIsEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this food card.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setError("");
      return;
    }

    setError("");
    setDeleting(true);

    try {
      const supabase = createClient();
      if (supabase) {
        const { error: deleteError } = await supabase
          .from("food_entries")
          .delete()
          .eq("id", entry.id);

        if (deleteError) {
          throw deleteError;
        }
      }

      storeEntryDeletion(entry.id);
      onDelete?.(entry.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this food card.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/55 p-0 sm:place-items-center sm:p-4">
      <article className="soft-fade max-h-[94dvh] w-full max-w-[760px] overflow-y-auto rounded-t-[28px] bg-[#fffefa] shadow-[0_30px_90px_rgba(0,0,0,0.28)] [scrollbar-width:none] sm:rounded-[28px] [&::-webkit-scrollbar]:hidden">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[#fffefa] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="size-3 rounded-full bg-accent" />
            <p className="font-mono text-sm uppercase text-muted">
              {entryTypeLabel(entry)}
            </p>
          </div>
          <div className="flex items-center gap-4 text-muted">
            {isEditing ? (
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="tap-scale text-ink disabled:cursor-wait disabled:opacity-50"
                aria-label="Save food card"
              >
                <Check aria-hidden="true" size={25} strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="tap-scale hover:text-ink"
                aria-label="Edit food card"
              >
                <Pencil aria-hidden="true" size={25} strokeWidth={1.9} />
              </button>
            )}
            <button
              type="button"
              onClick={deleteEntry}
              disabled={deleting}
              className={cn(
                "tap-scale flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-50",
                confirmDelete ? "text-accent" : "hover:text-ink"
              )}
              aria-label={confirmDelete ? "Confirm delete food card" : "Delete food card"}
            >
              {confirmDelete ? <span className="font-mono text-xs uppercase">Delete?</span> : null}
              <Trash2 aria-hidden="true" size={24} strokeWidth={1.9} />
            </button>
            <button type="button" onClick={onClose} className="tap-scale hover:text-ink" aria-label="Close food card">
              <X aria-hidden="true" size={29} strokeWidth={1.9} />
            </button>
          </div>
        </header>

        <img src={photo.imageUrl} alt={photo.alt} className="max-h-[54dvh] w-full object-cover" />

        <div className="space-y-7 px-6 py-7 sm:px-8">
          <CompactStars
            value={isEditing ? draft.rating : entry.rating ?? 0}
            editable={isEditing}
            onChange={(rating) => setDraft((current) => ({ ...current, rating }))}
          />
          <div className="space-y-4">
            {isEditing ? (
              <label className="grid gap-2">
                <span className="text-sm font-medium text-muted">Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="min-h-12 rounded-lg border border-border bg-white px-4 text-lg outline-none transition focus:border-accent"
                />
              </label>
            ) : (
              <h2 className="font-serif text-4xl italic leading-tight text-ink sm:text-5xl">
                {entry.title}
              </h2>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-sm text-muted sm:text-base">
              <span className="inline-flex items-center gap-2">
                <CalendarDays aria-hidden="true" size={17} strokeWidth={1.8} />
                {formatLongDate(entry.entryDate)}
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="grid size-5 place-items-center rounded-full border border-muted/70 text-[11px]">◎</span>
                {entryLocation(entry)}
              </span>
            </div>
          </div>

          <section className="border-t border-border pt-6">
            <h3 className="mb-5 font-mono text-sm uppercase text-muted">The memory</h3>
            {isEditing ? (
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                rows={5}
                className="w-full rounded-lg border border-border bg-white px-4 py-3 text-base leading-7 outline-none transition focus:border-accent"
                placeholder="What should you remember?"
              />
            ) : (
              <p className="font-serif text-2xl italic leading-[1.65] text-ink">
                {entry.notes || "No memory note yet."}
              </p>
            )}
          </section>

          <section className="pattern-dots rounded-lg border border-border bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 font-mono text-sm uppercase text-accent">
              <BookOpen aria-hidden="true" size={20} strokeWidth={1.9} />
              Cheng &amp; Saulė&apos;s kitchen notes
            </h3>
            {isEditing ? (
              <textarea
                value={draft.recipe}
                onChange={(event) => setDraft((current) => ({ ...current, recipe: event.target.value }))}
                rows={9}
                className="w-full rounded-lg border border-border bg-[#fffefa] px-4 py-3 font-mono text-sm leading-7 text-ink outline-none transition focus:border-accent"
                placeholder="Ingredients, method, links, or tweaks for next time."
              />
            ) : (
              <p className="whitespace-pre-line font-mono text-base leading-8 text-ink/78">
                {entry.recipe || "No recipe yet. Tap edit to add kitchen notes."}
              </p>
            )}
          </section>

          {entry.wantToRecreate ? (
            <p className="rounded-lg bg-[#E7EEE8] px-4 py-3 text-sm font-medium text-[#385A40]">
              Want to recreate
            </p>
          ) : null}
          {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}
        </div>
      </article>
    </div>
  );
}
