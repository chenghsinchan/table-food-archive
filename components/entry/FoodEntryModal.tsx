"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarDays, Check, ImagePlus, Pencil, Sparkles, Trash2, X } from "lucide-react";
import type { FoodEntry, FoodPhoto } from "@/types/food";
import { PhotoCarousel } from "@/components/entry/PhotoCarousel";
import { TagPill } from "@/components/ui/TagPill";
import { createClient } from "@/lib/supabase/client";
import { useGroups } from "@/lib/groups/GroupProvider";
import { trackEvent } from "@/lib/analytics/track";
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
  closeOnSwipeUp?: boolean;
};

type DraftEntry = {
  title: string;
  notes: string;
  recipe: string;
  ingredients: string;
  tags: string[];
  photos: FoodPhoto[];
  files: File[];
  customTag: string;
};

export function FoodEntryModal({ entry, onClose, onUpdate, onDelete, closeOnSwipeUp }: FoodEntryModalProps) {
  const { activeGroup } = useGroups();
  const kitchenNotesLabel = activeGroup?.name ? `${activeGroup.name}'s kitchen notes` : "Kitchen notes";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const gestureRef = useRef<{ startY: number; startX: number; active: boolean; endY: number | null }>({
    startY: 0,
    startX: 0,
    active: false,
    endY: null
  });
  const wheelDistanceRef = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftEntry>({
    title: entry.title,
    notes: entry.notes ?? "",
    recipe: entry.recipe ?? "",
    ingredients: entry.ingredients ?? "",
    tags: entry.tags,
    photos: entry.photos,
    files: [],
    customTag: ""
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isEditing) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, onClose]);

  function canCloseFromGesture(target: EventTarget | null) {
    if (!closeOnSwipeUp || isEditing) {
      return false;
    }

    if (!(target instanceof HTMLElement)) {
      return true;
    }

    return !target.closest("button, input, textarea, select, a");
  }

  function isAtScrollEnd(element: HTMLElement) {
    return element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
  }

  function isScrollable(element: HTMLElement) {
    return element.scrollHeight - element.clientHeight > 8;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!canCloseFromGesture(event.target)) {
      return;
    }

    gestureRef.current = {
      startY: event.clientY,
      startX: event.clientX,
      active: true,
      endY: null
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    const sheet = sheetRef.current;

    if (!gesture.active || !sheet || !canCloseFromGesture(event.target)) {
      return;
    }

    const deltaX = Math.abs(event.clientX - gesture.startX);

    // While there is still content to scroll, let the card scroll normally.
    if (isScrollable(sheet) && !isAtScrollEnd(sheet)) {
      gesture.endY = null;
      return;
    }

    // We are at the end (or the card is short enough not to scroll). Anchor here,
    // then require a deliberate upward pull past that point to close.
    if (gesture.endY === null) {
      gesture.endY = event.clientY;
      return;
    }

    const up = gesture.endY - event.clientY;

    if (up > 86 && up > deltaX * 1.35) {
      gesture.active = false;
      gesture.endY = null;
      onClose();
    }
  }

  function handlePointerEnd() {
    gestureRef.current.active = false;
    gestureRef.current.endY = null;
  }

  function handleWheel(event: React.WheelEvent<HTMLElement>) {
    if (!canCloseFromGesture(event.target)) {
      return;
    }

    const sheet = event.currentTarget;

    // Only dismiss when scrolling past the end of the content (trackpad/mouse equivalent
    // of pulling up past the bottom).
    if (!isAtScrollEnd(sheet) || event.deltaY <= 0) {
      wheelDistanceRef.current = 0;
      return;
    }

    wheelDistanceRef.current += event.deltaY;

    if (wheelDistanceRef.current > 140) {
      wheelDistanceRef.current = 0;
      onClose();
    }
  }

  function startEditing() {
    setDraft({
      title: entry.title,
      notes: entry.notes ?? "",
      recipe: entry.recipe ?? "",
      ingredients: entry.ingredients ?? "",
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

  async function detectIngredients() {
    const photo = draft.photos[0] ?? entry.photos[0];

    if (!photo) {
      setDetectError("Add a photo first — the AI reads ingredients from it.");
      return;
    }

    setDetecting(true);
    setDetectError("");

    try {
      const response = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: photo.imageUrl })
      });
      const data = (await response.json().catch(() => ({}))) as { ingredients?: string; error?: string };

      if (!response.ok || !data.ingredients) {
        throw new Error(data.error || "Could not read this photo.");
      }

      // Append below anything already written so nothing is overwritten.
      setDraft((current) => ({
        ...current,
        ingredients: current.ingredients.trim()
          ? `${current.ingredients.trim()}\n${data.ingredients}`
          : data.ingredients ?? ""
      }));
    } catch (caught) {
      setDetectError(caught instanceof Error ? caught.message : "Could not read this photo.");
    } finally {
      setDetecting(false);
    }
  }

  async function saveEdit() {
    setError("");
    setSaving(true);

    try {
      const nextEntry: FoodEntry = {
        ...entry,
        title: draft.title.trim() || entry.title,
        notes: draft.notes.trim() || undefined,
        recipe: draft.recipe.trim() || undefined,
        ingredients: draft.ingredients.trim() || undefined,
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
      trackEvent("dish_updated", { dishId: entry.id, groupId: entry.groupId });
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
      trackEvent("dish_deleted", { dishId: entry.id, groupId: entry.groupId });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this food card.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/55 p-0 sm:place-items-center sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !isEditing) {
          onClose();
        }
      }}
    >
      <article
        ref={sheetRef}
        className="soft-fade max-h-[94dvh] w-full max-w-[760px] overflow-y-auto rounded-t-[28px] bg-[#fffefa] shadow-sm [scrollbar-width:none] sm:rounded-[28px] [&::-webkit-scrollbar]:hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
      >
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

          {isEditing || entry.ingredients ? (
            <section className="border-t border-border pt-6">
              <h3 className="mb-4 font-mono text-sm uppercase text-muted">Ingredients</h3>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={draft.ingredients}
                    onChange={(event) => setDraft((current) => ({ ...current, ingredients: event.target.value }))}
                    rows={5}
                    className="w-full rounded-lg border border-border bg-white px-4 py-3 text-base leading-7 outline-none transition focus:border-accent"
                    placeholder={"One ingredient per line, e.g.\n300g squid\n2 lemons\nolive oil"}
                  />
                  <button
                    type="button"
                    onClick={detectIngredients}
                    disabled={detecting}
                    className="tap-scale flex min-h-11 items-center gap-2 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink disabled:cursor-wait disabled:opacity-60"
                  >
                    <Sparkles aria-hidden="true" size={15} strokeWidth={1.9} />
                    {detecting ? "Reading photo…" : "Detect from photo"}
                  </button>
                  {detectError ? <p className="text-sm leading-6 text-accent">{detectError}</p> : null}
                </div>
              ) : (
                <ul className="space-y-1">
                  {(entry.ingredients ?? "")
                    .split(/\n|,/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, index) => (
                      <li key={index} className="text-base leading-7 text-ink/80">
                        {line}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          ) : null}

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
              {kitchenNotesLabel}
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
