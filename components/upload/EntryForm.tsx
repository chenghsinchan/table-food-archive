"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createEntryInSupabase } from "@/lib/supabase/save-entry";
import { photoFromUpload, uploadFoodPhotos } from "@/lib/supabase/storage";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { useSavedTags } from "@/lib/hooks/useSavedTags";
import { canonicalTagKey, commonTags, uniqueTagNames } from "@/lib/tags";
import { TagPill } from "@/components/ui/TagPill";
import { PhotoUploader } from "@/components/upload/PhotoUploader";
import type { EntryType, FoodEntry, FoodPhoto } from "@/types/food";

const entryTypes: EntryType[] = ["home", "restaurant", "travel", "recipe"];

type EntryFormProps = {
  entries: FoodEntry[];
};

type RankedTag = {
  name: string;
  count: number;
};

export function EntryForm({ entries }: EntryFormProps) {
  const searchParams = useSearchParams();
  const { upsertEntry } = useFoodEntries();
  const [tagSourceEntries, setTagSourceEntries] = useState(entries);
  const [type, setType] = useState<EntryType>("home");
  const [wantToRecreate, setWantToRecreate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const returnTo = safeReturnPath(searchParams.get("returnTo"));
  const savedTags = useSavedTags(tags);
  const isSaving = status === "saving";

  useEffect(() => {
    setTagSourceEntries(entries);
  }, [entries]);

  const suggestedTags = useMemo(() => rankTags(tagSourceEntries, tags, savedTags), [tagSourceEntries, tags, savedTags]);

  function toggleTag(tag: string) {
    const key = canonicalTagKey(tag);
    setTags((current) => current.some((item) => canonicalTagKey(item) === key)
      ? current.filter((item) => canonicalTagKey(item) !== key)
      : uniqueTagNames([...current, tag]));
  }

  function addCustomTag() {
    const tag = customTag.trim();

    if (!tag) {
      return;
    }

    setTags((current) => {
      return uniqueTagNames([...current, tag]);
    });
    setCustomTag("");
  }

  function handleCustomTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addCustomTag();
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (savingRef.current) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();

    if (!title) {
      setError("Add a title before saving.");
      return;
    }

    if (!files.length) {
      setError("Add at least one photo before saving.");
      return;
    }

    setStatus("saving");
    savingRef.current = true;
    let uploadedPhotos: FoodPhoto[] = [];

    try {
      const entryId = crypto.randomUUID();
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase is not connected. Shared archive saves need Supabase.");
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();
      uploadedPhotos = await uploadEntryPhotos({ supabase, entryId, files, title });
      const entry = buildLocalEntry({ id: entryId, form, title, type, wantToRecreate, tags, photos: uploadedPhotos });

      await createEntryInSupabase(supabase, entry, { createdById: user?.id ?? null });
      upsertEntry({ ...entry, createdById: user?.id ?? undefined });
      setStatus("saved");
      window.location.replace(returnTo === "/" ? `/entry/${entry.id}` : returnTo);
    } catch (caught) {
      await cleanupUploadedPhotos(uploadedPhotos);
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "Something went wrong while saving this memory.");
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <form className="space-y-5" onSubmit={saveEntry}>
      <PhotoUploader onFilesChange={setFiles} />

      <section className="rounded-lg bg-white/72 p-4 shadow-sm sm:p-5">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-muted">Title</span>
            <input
              required
              name="title"
              placeholder="Olive Oil Squid"
              className="min-h-14 rounded-lg border border-border bg-white px-4 text-lg outline-none transition focus:border-accent"
            />
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-muted">Type</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {entryTypes.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`tap-scale min-h-12 rounded-full px-3 text-sm font-semibold capitalize ${
                    type === item ? "bg-ink text-white" : "bg-surface-warm text-ink"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-muted">Notes</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="Small details worth remembering."
              className="rounded-lg border border-border bg-white px-4 py-3 text-base leading-7 outline-none transition focus:border-accent"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-muted">Restaurant name</span>
              <input name="restaurant" className="min-h-12 rounded-lg border border-border bg-white px-4 outline-none transition focus:border-accent" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-muted">Date</span>
              <input name="date" type="date" className="min-h-12 rounded-lg border border-border bg-white px-4 outline-none transition focus:border-accent" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-muted">City</span>
              <input name="city" className="min-h-12 rounded-lg border border-border bg-white px-4 outline-none transition focus:border-accent" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-muted">Country</span>
              <input name="country" className="min-h-12 rounded-lg border border-border bg-white px-4 outline-none transition focus:border-accent" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-muted">Recipe</span>
            <textarea
              name="recipe"
              rows={5}
              placeholder="Loose method, ingredients, or a link."
              className="rounded-lg border border-border bg-white px-4 py-3 text-base leading-7 outline-none transition focus:border-accent"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-warm/72 p-3">
            <span className="text-sm font-medium text-ink">Want to recreate</span>
            <input
              type="checkbox"
              checked={wantToRecreate}
              onChange={(event) => setWantToRecreate(event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`grid size-8 place-items-center rounded-full transition ${
                wantToRecreate ? "bg-ink text-white" : "bg-white text-transparent"
              }`}
            >
              <Check size={16} strokeWidth={2.1} />
            </span>
          </label>

          <div className="grid gap-3">
            <span className="text-sm font-medium text-muted">Tags</span>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag) => (
                <TagPill key={tag.name} active={tags.some((selected) => canonicalTagKey(selected) === canonicalTagKey(tag.name))} onClick={() => toggleTag(tag.name)}>
                  {tag.name}
                </TagPill>
              ))}
              {tags.filter((tag) => !suggestedTags.some((item) => canonicalTagKey(item.name) === canonicalTagKey(tag))).map((tag) => (
                <TagPill key={tag} active onClick={() => toggleTag(tag)}>
                  {tag}
                </TagPill>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customTag}
                onChange={(event) => setCustomTag(event.target.value)}
                onKeyDown={handleCustomTagKeyDown}
                placeholder="Add your own tag"
                className="min-h-12 flex-1 rounded-lg border border-border bg-white px-4 outline-none transition focus:border-accent"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="tap-scale min-h-12 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isSaving}
        className="tap-scale flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-70"
      >
        <Save aria-hidden="true" size={18} />
        {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save memory"}
      </button>
      {error ? <p className="text-center text-sm leading-6 text-accent">{error}</p> : null}
    </form>
  );
}

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.startsWith("/add") || value.startsWith("/login")) {
    return "/";
  }

  return value;
}

function rankTags(entries: FoodEntry[], selectedTags: string[], savedTags: string[]): RankedTag[] {
  const counts = new Map<string, RankedTag>();
  const preferredNames = new Map<string, string>();

  for (const tag of [...commonTags, ...savedTags]) {
    preferredNames.set(canonicalTagKey(tag), tag);
  }

  for (const entry of entries) {
    for (const rawTag of entry.tags) {
      const trimmedTag = rawTag.trim();

      if (!trimmedTag) {
        continue;
      }

      const key = canonicalTagKey(trimmedTag);
      const name = preferredNames.get(key) ?? trimmedTag;
      preferredNames.set(key, name);
      counts.set(key, {
        name,
        count: (counts.get(key)?.count ?? 0) + 1
      });
    }
  }

  for (const tag of [...commonTags, ...savedTags, ...selectedTags]) {
    const key = canonicalTagKey(tag);

    if (!counts.has(key)) {
      counts.set(key, {
        name: preferredNames.get(key) ?? tag,
        count: 0
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => {
    const countDifference = b.count - a.count;

    if (countDifference !== 0) {
      return countDifference;
    }

    const fallbackIndexA = commonTags.findIndex((tag) => canonicalTagKey(tag) === canonicalTagKey(a.name));
    const fallbackIndexB = commonTags.findIndex((tag) => canonicalTagKey(tag) === canonicalTagKey(b.name));

    if (fallbackIndexA !== -1 || fallbackIndexB !== -1) {
      return (fallbackIndexA === -1 ? Number.POSITIVE_INFINITY : fallbackIndexA) -
        (fallbackIndexB === -1 ? Number.POSITIVE_INFINITY : fallbackIndexB);
    }

    return a.name.localeCompare(b.name);
  });
}

function buildLocalEntry({
  id,
  form,
  title,
  type,
  wantToRecreate,
  tags,
  photos
}: {
  id: string;
  form: FormData;
  title: string;
  type: EntryType;
  wantToRecreate: boolean;
  tags: string[];
  photos: FoodPhoto[];
}): FoodEntry {
  return {
    id,
    title,
    type,
    notes: String(form.get("notes") || "").trim() || undefined,
    recipe: String(form.get("recipe") || "").trim() || undefined,
    restaurantName: String(form.get("restaurant") || "").trim() || undefined,
    city: String(form.get("city") || "").trim() || undefined,
    country: String(form.get("country") || "").trim() || undefined,
    entryDate: String(form.get("date") || "").trim() || new Date().toISOString().slice(0, 10),
    wantToRecreate,
    tags: uniqueTagNames(tags),
    photos
  };
}

async function uploadEntryPhotos({
  supabase,
  entryId,
  files,
  title
}: {
  supabase: NonNullable<ReturnType<typeof createClient>>;
  entryId: string;
  files: File[];
  title: string;
}): Promise<FoodPhoto[]> {
  const uploadedPhotos = await uploadFoodPhotos({ supabase, entryId, files });

  return uploadedPhotos.map((upload, index) => photoFromUpload({ entryId, title, upload, index }));
}

async function cleanupUploadedPhotos(photos: FoodPhoto[]) {
  const storagePaths = photos.map((photo) => photo.storagePath).filter(Boolean) as string[];

  if (!storagePaths.length) {
    return;
  }

  const supabase = createClient();
  await supabase?.storage.from("food-photos").remove(storagePaths);
}
