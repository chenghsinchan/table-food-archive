"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarDays, Check, ImagePlus, Pencil, Star, Trash2, X } from "lucide-react";
import type { FoodEntry, FoodPhoto } from "@/types/food";
import { PhotoCarousel } from "@/components/entry/PhotoCarousel";
import { TagPill } from "@/components/ui/TagPill";
import { createClient } from "@/lib/supabase/client";
import { deleteEntryFromSupabase, saveEntryToSupabase } from "@/lib/supabase/save-entry";
import { photoFromUpload, uploadFoodPhotos } from "@/lib/supabase/storage";
import { useSavedTags } from "@/lib/hooks/useSavedTags";
import { canonicalTagKey, commonTags, uniqueTagNames } from "@/lib/tags";
import { cn } from "@/lib/utils/cn";
import { formatLongDate } from "@/lib/utils/date";
import { entryLocation, entryTypeLabel } from "@/lib/utils/entries";

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
  tags: string[];
  photos: FoodPhoto[];
  files: File[];
  customTag: string;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftEntry>({
    title: entry.title,
    rating: entry.rating ?? 0,
    notes: entry.notes ?? "",
    recipe: entry.recipe ?? "",
    tags: entry.tags,
    photos: entry.photos,
    files: [],
    customTag: ""
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const savedTags = useSavedTags([...entry.tags, ...draft.tags]);
  const newPhotoPreviews = useMemo(
    () => draft.files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [draft.files]
  );
  const tagChoices = useMemo(() => {
    const byKey = new Map<string, string>();

    for (const tag of [...entry.tags, ...draft.tags, ...savedTags, ...commonTags]) {
      const trimmed = tag.trim();
      if (trimmed) {
        byKey.set(canonicalTagKey(trimmed), trimmed);
      }
    }

    return Array.from(byKey.values());
  }, [draft.tags, entry.tags, savedTags]);

  useEffect(() => {
    return () => {
      newPhotoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newPhotoPreviews]);

  function startEditing() {
    setDraft({
      title: entry.title,
      rating: entry.rating ?? 0,
      notes: entry.notes ?? "",
      recipe: entry.recipe ?? "",
      tags: entry.tags,
      photos: entry.photos,
      files: [],
      customTag: ""
    });
    setError("");
    setIsEditing(true);
  }

  function toggleTag(tag: string) {
    setDraft((current) => {
      const key = canonicalTagKey(tag);
      const exists = current.tags.some((candidate) => canonicalTagKey(candidate) === key);

      return {
        ...current,
        tags: exists
          ? current.tags.filter((candidate) => canonicalTagKey(candidate) !== key)
          : uniqueTagNames([...current.tags, tag])
      };
    });
  }

  function addCustomTag() {
    const tag = draft.customTag.trim();

    if (!tag) {
      return;
    }

    setDraft((current) => {
      const exists = current.tags.some((candidate) => canonicalTagKey(candidate) === canonicalTagKey(tag));

      return {
        ...current,
        customTag: "",
        tags: exists ? current.tags : uniqueTagNames([...current.tags, tag])
      };
    });
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    setDraft((current) => ({ ...current, files: [...current.files, ...imageFiles] }));
  }

  async function saveEdit() {
    setError("");
    setSaving(true);

    try {
      const nextEntry: FoodEntry = {
        ...entry,
        title: draft.title.trim() || entry.title,
        rating: draft.rating || undefined,
        notes: draft.notes.trim() || undefined,
        recipe: draft.recipe.trim() || undefined,
        tags: uniqueTagNames(draft.tags),
        photos: draft.photos
      };

      const supabase = createClient();
      if (!supabase) {
        throw new Error("Supabase is not connected.");
      }

      if (draft.files.length) {
        const uploads = await uploadFoodPhotos({ supabase, entryId: entry.id, files: draft.files });
        nextEntry.photos = [
          ...draft.photos,
          ...uploads.map((upload, index) => photoFromUpload({ entryId: entry.id, title: nextEntry.title, upload, index }))
        ];
      }

      if (!nextEntry.photos.length) {
        throw new Error("Keep at least one photo on this food card.");
      }

      await saveEntryToSupabase(supabase, nextEntry);
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
      if (!supabase) {
        throw new Error("Supabase is not connected.");
      }

      await deleteEntryFromSupabase(supabase, entry.id);
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
      <article className="soft-fade max-h-[94dvh] w-full max-w-[760px] overflow-y-auto rounded-t-[28px] bg-[#fffefa] shadow-sm [scrollbar-width:none] sm:rounded-[28px] [&::-webkit-scrollbar]:hidden">
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
                onClick={startEditing}
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

        <PhotoCarousel photos={entry.photos} />

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

          <section className="border-t border-border pt-6">
            <h3 className="mb-4 font-mono text-sm uppercase text-muted">Tags</h3>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {tagChoices.map((tag) => (
                    <TagPill
                      key={tag}
                      active={draft.tags.some((candidate) => canonicalTagKey(candidate) === canonicalTagKey(tag))}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </TagPill>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={draft.customTag}
                    onChange={(event) => setDraft((current) => ({ ...current, customTag: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomTag();
                      }
                    }}
                    placeholder="Add tag"
                    className="min-h-11 flex-1 rounded-lg border border-border bg-white px-4 text-sm outline-none transition focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="tap-scale rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {entry.tags.length ? entry.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink">
                    {tag}
                  </span>
                )) : <p className="text-sm text-muted">No tags yet.</p>}
              </div>
            )}
          </section>

          {isEditing ? (
            <section className="border-t border-border pt-6">
              <h3 className="mb-4 font-mono text-sm uppercase text-muted">Photos</h3>
              <div className="grid grid-cols-3 gap-3">
                {draft.photos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-lg">
                    <img
                      src={photo.thumbnailUrl ?? photo.imageUrl}
                      alt={photo.alt}
                      loading="lazy"
                      sizes="160px"
                      className="aspect-[4/5] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, photos: current.photos.filter((item) => item.id !== photo.id) }))}
                      className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/86 text-ink shadow-sm"
                      aria-label="Remove photo"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                    </button>
                  </div>
                ))}
                {newPhotoPreviews.map(({ file, url }) => (
                  <div key={`${file.name}-${file.lastModified}`} className="group relative overflow-hidden rounded-lg">
                    <img src={url} alt={file.name} loading="lazy" sizes="160px" className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, files: current.files.filter((item) => item !== file) }))}
                      className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/86 text-ink shadow-sm"
                      aria-label="Remove new photo"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="tap-scale grid aspect-[4/5] place-items-center rounded-lg border border-dashed border-border bg-white text-muted"
                  aria-label="Add photos"
                >
                  <ImagePlus aria-hidden="true" size={26} strokeWidth={1.8} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => addFiles(event.target.files)}
              />
            </section>
          ) : null}

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
            <p className="rounded-lg bg-surface-warm px-4 py-3 text-sm font-medium text-ink">
              Want to recreate
            </p>
          ) : null}
          {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}
        </div>
      </article>
    </div>
  );
}
