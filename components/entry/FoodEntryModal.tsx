"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Mic, Sparkles, Trash2, X } from "lucide-react";
import type { Atmosphere, EffortLevel, FoodEntry, FoodPhoto, MoodKey } from "@/types/food";
import { AtmosphereField } from "@/components/entry/AtmosphereField";
import { PhotoCarousel } from "@/components/entry/PhotoCarousel";
import { createClient } from "@/lib/supabase/client";
import { deleteEntryFromSupabase, saveEntryToSupabase } from "@/lib/supabase/save-entry";
import { photoFromUpload, uploadFoodPhotos } from "@/lib/supabase/storage";
import { useSavedTags } from "@/lib/hooks/useSavedTags";
import { canonicalTagKey, commonTags, uniqueTagNames } from "@/lib/tags";
import { trackEvent } from "@/lib/analytics/track";
import { MOODS, atmosphereLabel, hasMood, moodByKey } from "@/lib/moods";
import { cn } from "@/lib/utils/cn";
import { formatLongDate } from "@/lib/utils/date";
import { entryLocation } from "@/lib/utils/entries";

const PROMPTS = [
  "Anything worth keeping?",
  "What was happening around this meal?",
  "Why might you return to this?",
  "Leave a fragment…"
];

const EFFORTS: Array<{ key: EffortLevel; label: string }> = [
  { key: "easy", label: "Easy" },
  { key: "moderate", label: "Moderate" },
  { key: "involved", label: "Involved" }
];

type FoodEntryModalProps = {
  entry: FoodEntry;
  onClose: () => void;
  onUpdate?: (entry: FoodEntry) => void;
  onDelete?: (entryId: string) => void;
  closeOnSwipeUp?: boolean;
};

type Draft = {
  title: string;
  notes: string;
  recipe: string;
  ingredients: string;
  city: string;
  placeLabel: string;
  weather: string;
  mood?: MoodKey;
  effort?: EffortLevel;
  atmosphere?: Atmosphere;
  tags: string[];
  customTag: string;
  photos: FoodPhoto[];
  files: File[];
};

export function FoodEntryModal({ entry, onClose, onUpdate, onDelete, closeOnSwipeUp }: FoodEntryModalProps) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gesture = useRef({ y: 0, active: false });
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [detectError, setDetectError] = useState("");
  const [draft, setDraft] = useState<Draft>(() => draftFromEntry(entry));
  const [promptIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length));

  const mood = moodByKey(editing ? draft.mood : entry.mood);
  const moodIsSet = editing ? Boolean(draft.mood) : hasMood(entry);
  const accentBg = moodIsSet ? mood.bg : "#1a1817";
  const accentFg = moodIsSet ? mood.fg : "#fbf9f4";

  const savedTags = useSavedTags([...entry.tags, ...draft.tags]);
  const tagChoices = useMemo(() => {
    const byKey = new Map<string, string>();

    for (const tag of [...entry.tags, ...draft.tags, ...savedTags, ...commonTags]) {
      const trimmed = tag.trim();
      if (trimmed) byKey.set(canonicalTagKey(trimmed), trimmed);
    }

    return Array.from(byKey.values());
  }, [draft.tags, entry.tags, savedTags]);

  const newPhotoPreviews = useMemo(
    () => draft.files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [draft.files]
  );

  useEffect(() => {
    return () => {
      newPhotoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newPhotoPreviews]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !editing) onClose();
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [editing, onClose]);

  function startEditing() {
    setDraft(draftFromEntry(entry));
    setError("");
    setDetectError("");
    setConfirmDelete(false);
    setEditing(true);
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
    if (!tag) return;

    setDraft((current) => ({
      ...current,
      customTag: "",
      tags: uniqueTagNames([...current.tags, tag])
    }));
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
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

  async function save() {
    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not connected.");

      const next: FoodEntry = {
        ...entry,
        title: draft.title.trim() || entry.title,
        notes: draft.notes.trim() || undefined,
        recipe: draft.recipe.trim() || undefined,
        ingredients: draft.ingredients.trim() || undefined,
        city: draft.city.trim() || undefined,
        placeLabel: draft.placeLabel.trim() || undefined,
        weather: draft.weather.trim() || undefined,
        mood: draft.mood,
        effort: draft.effort,
        atmosphere: draft.atmosphere,
        tags: uniqueTagNames(draft.tags),
        photos: draft.photos
      };

      if (draft.files.length) {
        const uploads = await uploadFoodPhotos({ supabase, entryId: entry.id, files: draft.files });
        next.photos = [
          ...draft.photos,
          ...uploads.map((upload, index) => photoFromUpload({ entryId: entry.id, title: next.title, upload, index }))
        ];
      }

      if (!next.photos.length) {
        throw new Error("Keep at least one photograph on this memory.");
      }

      await saveEntryToSupabase(supabase, next);
      onUpdate?.(next);
      setEditing(false);
      trackEvent("dish_updated", { dishId: entry.id, groupId: entry.groupId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this memory.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not connected.");
      await deleteEntryFromSupabase(supabase, entry.id);
      trackEvent("dish_deleted", { dishId: entry.id, groupId: entry.groupId });
      onDelete?.(entry.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this memory.");
    } finally {
      setDeleting(false);
    }
  }

  function pointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!closeOnSwipeUp || editing || (event.target as HTMLElement).closest("button,input,textarea,select")) return;
    gesture.current = { y: event.clientY, active: true };
  }

  function pointerMove(event: React.PointerEvent<HTMLElement>) {
    const sheet = sheetRef.current;
    if (!gesture.current.active || !sheet || sheet.scrollTop + sheet.clientHeight < sheet.scrollHeight - 8) return;
    if (gesture.current.y - event.clientY > 100) {
      gesture.current.active = false;
      onClose();
    }
  }

  const ingredientLines = (entry.ingredients ?? "")
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-[rgba(20,16,14,0.55)] backdrop-blur-[3px] sm:place-items-center sm:p-4"
      onPointerDown={(event) => event.target === event.currentTarget && !editing && onClose()}
    >
      <article
        ref={sheetRef}
        className="memory-sheet max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[30px] bg-[#fbf9f4] shadow-[0_30px_60px_-20px_rgba(20,16,14,0.45)] [scrollbar-width:none] sm:rounded-[30px] [&::-webkit-scrollbar]:hidden"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => { gesture.current.active = false; }}
      >
        {/* ---- hero ---- */}
        <div className="relative overflow-hidden rounded-t-[30px]">
          <PhotoCarousel photos={editing ? draft.photos : entry.photos} />
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: "linear-gradient(to top, rgba(12,10,9,0.62), transparent)" }}
          />
          {moodIsSet ? (
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[rgba(12,10,9,0.38)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white backdrop-blur-[6px]">
              <span className="size-2 rounded-full" style={{ background: mood.bg }} />
              {mood.name}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => (editing ? setEditing(false) : onClose())}
            className="absolute right-4 top-4 grid size-[30px] place-items-center rounded-full bg-[rgba(12,10,9,0.45)] text-white"
            aria-label={editing ? "Cancel editing" : "Close memory"}
          >
            <X size={16} />
          </button>
          {!editing ? (
            <p className="pointer-events-none absolute inset-x-5 bottom-4 font-serif text-[26px] font-semibold italic leading-[1.1] text-[#fbf9f4]">
              {entry.title}
            </p>
          ) : null}
        </div>

        {!editing ? (
          /* ============================ VIEW ============================ */
          <div className="flex flex-col gap-[18px] px-[22px] py-6">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Meta label="Date">{formatLongDate(entry.entryDate)}</Meta>
              <Meta label="Place">{entry.placeLabel || entryLocation(entry)}</Meta>
              {entry.weather ? <Meta label="Weather · auto">{entry.weather}</Meta> : null}
              {entry.dish?.timesMade && entry.dish.timesMade > 1 ? (
                <Meta label="Made">{entry.dish.timesMade} times</Meta>
              ) : null}
            </div>

            {entry.atmosphere ? (
              <AtmosphereField value={entry.atmosphere} mood={moodIsSet ? mood : undefined} readOnly />
            ) : null}

            {entry.notes ? (
              <div>
                <SectionLabel>Optional words</SectionLabel>
                <blockquote className="mt-2 font-serif text-[18px] italic leading-[1.5] text-ink">
                  “{entry.notes}”
                </blockquote>
              </div>
            ) : null}

            <div className="h-px bg-[#ece8df]" />

            {/* ---- the dish record ---- */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-[21px] font-semibold italic leading-tight text-ink">{entry.title}</p>
                {entry.effort ? (
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    {entry.effort}
                  </span>
                ) : null}
              </div>

              {entry.tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#efece4] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a8378]">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {ingredientLines.length ? (
                <div>
                  <SectionLabel>Ingredients</SectionLabel>
                  <ul className="mt-2 font-mono text-[11px] text-ink">
                    {ingredientLines.map((line, index) => (
                      <li key={index} className="border-t border-dashed border-[#dcd7cc] py-1.5 first:border-t-0">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {entry.recipe ? (
                <div>
                  <SectionLabel>How we made it</SectionLabel>
                  <p className="mt-2 whitespace-pre-line text-[13.5px] leading-6 text-[#4a453d]">{entry.recipe}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-1 flex gap-2.5">
              <button
                type="button"
                onClick={startEditing}
                className="tap-scale flex-1 rounded-full border py-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ borderColor: accentBg, color: moodIsSet ? mood.bg : "#1a1817" }}
              >
                Edit entry
              </button>
              <button
                type="button"
                onClick={onClose}
                className="tap-scale flex-1 rounded-full py-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ background: accentBg, color: accentFg }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ============================ EDIT ============================ */
          <div className="flex flex-col gap-5 px-[22px] py-6">
            <div>
              <SectionLabel>Mood</SectionLabel>
              <div className="mt-2 flex items-center gap-3">
                {MOODS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        mood: current.mood === option.key ? undefined : option.key
                      }))
                    }
                    aria-label={`Mood: ${option.name}`}
                    aria-pressed={draft.mood === option.key}
                    className="size-[26px] rounded-full"
                    style={{
                      background: option.bg,
                      boxShadow: draft.mood === option.key ? "0 0 0 3px #fbf9f4, 0 0 0 5px #1a1817" : undefined
                    }}
                  />
                ))}
              </div>
            </div>

            <Field label="Name">
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="entry-input font-serif text-[22px] italic"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Place"><input value={draft.placeLabel} onChange={(event) => setDraft({ ...draft, placeLabel: event.target.value })} placeholder="At home · Angel" className="entry-input" /></Field>
              <Field label="City"><input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} className="entry-input" /></Field>
            </div>
            <Field label="Weather · auto">
              <input value={draft.weather} onChange={(event) => setDraft({ ...draft, weather: event.target.value })} placeholder="11°C · Rain · Evening" className="entry-input" />
              <p className="mt-1 font-serif text-[12px] italic text-muted">Filled in from the date and place — correct it if it&apos;s off.</p>
            </Field>

            <div>
              <SectionLabel>Atmosphere</SectionLabel>
              <div className="mt-2">
                <AtmosphereField
                  value={draft.atmosphere}
                  onChange={(atmosphere) => setDraft((current) => ({ ...current, atmosphere }))}
                  onMoodChange={(nextMood) => setDraft((current) => ({ ...current, mood: nextMood.key }))}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <SectionLabel>Optional words</SectionLabel>
                <button
                  type="button"
                  onClick={() => setRecording((current) => !current)}
                  aria-pressed={recording}
                  aria-label="Voice note"
                  className={cn(
                    "grid size-8 place-items-center rounded-full border border-[#dcd7cc] text-muted transition",
                    recording && "border-red-600 bg-red-600 text-white"
                  )}
                >
                  <Mic size={14} />
                </button>
              </div>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder={PROMPTS[promptIndex]}
                className="entry-input mt-2 py-2 font-serif text-[15px] italic"
              />
            </div>

            <div>
              <SectionLabel>Effort</SectionLabel>
              <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-full border border-[#dcd7cc]">
                {EFFORTS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        effort: current.effort === option.key ? undefined : option.key
                      }))
                    }
                    className="py-2 font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={
                      draft.effort === option.key
                        ? { background: accentBg, color: accentFg }
                        : { background: "#efece4", color: "#6d675c" }
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Tags</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tagChoices.map((tag) => {
                  const active = draft.tags.some((candidate) => canonicalTagKey(candidate) === canonicalTagKey(tag));

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]"
                      style={
                        active
                          ? { background: accentBg, color: accentFg, borderColor: accentBg }
                          : { background: "#efece4", color: "#8a8378", borderColor: "#efece4" }
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={draft.customTag}
                  onChange={(event) => setDraft({ ...draft, customTag: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="Add tag"
                  className="entry-input flex-1"
                />
                <button type="button" onClick={addCustomTag} className="tap-scale rounded-full bg-[#efece4] px-4 font-mono text-[9px] uppercase tracking-[0.14em] text-ink">
                  Add
                </button>
              </div>
            </div>

            <div>
              <SectionLabel>Ingredients</SectionLabel>
              <textarea
                rows={4}
                value={draft.ingredients}
                onChange={(event) => setDraft({ ...draft, ingredients: event.target.value })}
                placeholder={"One per line\n300g squid\n2 lemons"}
                className="entry-input mt-2 py-2 font-mono text-[12px]"
              />
              <button
                type="button"
                onClick={detectIngredients}
                disabled={detecting}
                className="tap-scale mt-2 inline-flex items-center gap-2 rounded-full bg-[#efece4] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink disabled:cursor-wait disabled:opacity-60"
              >
                <Sparkles size={13} />
                {detecting ? "Reading photo…" : "Detect from photo"}
              </button>
              {detectError ? <p className="mt-1.5 text-[12px] leading-5 text-red-700">{detectError}</p> : null}
            </div>

            <Field label="How we made it">
              <textarea rows={5} value={draft.recipe} onChange={(event) => setDraft({ ...draft, recipe: event.target.value })} className="entry-input py-2 text-[13px]" />
            </Field>

            <div>
              <SectionLabel>Photographs</SectionLabel>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {draft.photos.map((photo) => (
                  <div key={photo.id} className="relative overflow-hidden rounded-[10px]">
                    <img src={photo.thumbnailUrl ?? photo.imageUrl} alt={photo.alt} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, photos: current.photos.filter((item) => item.id !== photo.id) }))}
                      className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/85 text-ink"
                      aria-label="Remove photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {newPhotoPreviews.map(({ file, url }) => (
                  <div key={`${file.name}-${file.lastModified}`} className="relative overflow-hidden rounded-[10px]">
                    <img src={url} alt={file.name} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, files: current.files.filter((item) => item !== file) }))}
                      className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/85 text-ink"
                      aria-label="Remove new photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="tap-scale grid aspect-[4/5] place-items-center rounded-[10px] border border-dashed border-[#dcd7cc] text-muted"
                  aria-label="Add photos"
                >
                  <ImagePlus size={20} />
                </button>
              </div>
              <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files)} />
            </div>

            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className={cn("inline-flex items-center gap-2 text-[13px]", confirmDelete ? "text-red-700" : "text-muted")}
            >
              <Trash2 size={15} /> {confirmDelete ? "Tap again to delete this memory" : "Delete memory"}
            </button>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="tap-scale flex-1 rounded-full border border-[#dcd7cc] py-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="tap-scale flex-1 rounded-full py-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em] disabled:cursor-wait disabled:opacity-70"
                style={{ background: accentBg, color: accentFg }}
              >
                {saving ? "Saving…" : "Save entry"}
              </button>
            </div>

            {error ? <p className="text-[13px] leading-5 text-red-700">{error}</p> : null}
          </div>
        )}
      </article>
    </div>
  );
}

function draftFromEntry(entry: FoodEntry): Draft {
  return {
    title: entry.title,
    notes: entry.notes ?? "",
    recipe: entry.recipe ?? "",
    ingredients: entry.ingredients ?? "",
    city: entry.city ?? "",
    placeLabel: entry.placeLabel ?? "",
    weather: entry.weather ?? "",
    mood: entry.mood,
    effort: entry.effort,
    atmosphere: entry.atmosphere,
    tags: entry.tags,
    customTag: "",
    photos: entry.photos,
    files: []
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a8378]">{children}</p>;
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 font-mono text-[11px] text-ink">{children}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a8378]">{label}</span>
      {children}
    </label>
  );
}
