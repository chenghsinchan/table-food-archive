"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import type { Atmosphere, EntryType, FoodEntry, FoodPhoto, MoodKey } from "@/types/food";
import type { PhotoSource } from "@/types/analytics";
import { AtmosphereField } from "@/components/entry/AtmosphereField";
import { MOODS, moodByKey } from "@/lib/moods";
import { PhotoUploader } from "@/components/upload/PhotoUploader";
import { createClient } from "@/lib/supabase/client";
import { createEntryInSupabase, saveEntryToSupabase } from "@/lib/supabase/save-entry";
import { photoFromUpload, uploadFoodPhotos } from "@/lib/supabase/storage";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { useGroups } from "@/lib/groups/GroupProvider";
import { trackEvent } from "@/lib/analytics/track";

type EntryFormProps = { entries: FoodEntry[] };

export function EntryForm({}: EntryFormProps) {
  const searchParams = useSearchParams();
  const { upsertEntry } = useFoodEntries();
  const { activeGroupId } = useGroups();
  const [files, setFiles] = useState<File[]>([]);
  const [photoSource, setPhotoSource] = useState<PhotoSource>("library");
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<FoodEntry | null>(null);
  const [atmosphere, setAtmosphere] = useState<Atmosphere>();
  const [moodKey, setMoodKey] = useState<MoodKey | undefined>();
  const [fragment, setFragment] = useState("");
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const returnTo = safeReturnPath(searchParams.get("returnTo"));

  async function capture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!files.length) {
      setError("Choose a photograph first.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const now = new Date();
    const entryId = crypto.randomUUID();
    const title = String(form.get("title") || "").trim() || defaultTitle(now);
    const type = (String(form.get("type") || "home") as EntryType);
    let photos: FoodPhoto[] = [];

    savingRef.current = true;
    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not connected. Shared archive saves need Supabase.");
      const { data: { user } } = await supabase.auth.getUser();
      const uploaded = await uploadFoodPhotos({ supabase, entryId, files });
      photos = uploaded.map((upload, index) => photoFromUpload({ entryId, title, upload, index }));

      const entry: FoodEntry = {
        id: entryId,
        title,
        type,
        notes: undefined,
        recipe: text(form, "method"),
        ingredients: text(form, "ingredients"),
        restaurantName: text(form, "restaurant"),
        city: text(form, "city"),
        country: text(form, "country"),
        placeLabel: text(form, "place"),
        entryDate: text(form, "date") || now.toISOString().slice(0, 10),
        entryTime: now.toTimeString().slice(0, 8),
        daypart: daypartFor(now.getHours()),
        wantToRecreate: Boolean(form.get("recreate")),
        groupId: activeGroupId ?? undefined,
        createdById: user?.id,
        tags: [],
        photos
      };

      await createEntryInSupabase(supabase, entry, { createdById: user?.id ?? null });
      upsertEntry(entry);
      setSavedEntry(entry);
      trackEvent("dish_added", { groupId: entry.groupId, dishId: entry.id, source: photoSource });
      void notifyGroupOfNewEntry(entry.id);
    } catch (caught) {
      if (photos.length) await cleanupUploadedPhotos(photos);
      setError(caught instanceof Error ? caught.message : "Could not save this memory.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function finish() {
    if (!savedEntry) return;
    setSaving(true);
    setError("");
    try {
      const next = { ...savedEntry, atmosphere, mood: moodKey, notes: fragment.trim() || undefined };
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not connected.");
      await saveEntryToSupabase(supabase, next);
      upsertEntry(next);
      window.location.replace(returnTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The memory is saved, but the atmosphere could not be added.");
      setSaving(false);
    }
  }

  if (savedEntry) {
    return (
      <section className="mx-auto max-w-lg space-y-7 pb-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          <span className="grid size-5 place-items-center rounded-full bg-ink text-white"><Check size={12} /></span>
          Saved
        </div>
        <div>
          <h2 className="font-serif text-4xl italic leading-tight text-ink">How was the atmosphere?</h2>
          <p className="mt-2 text-sm text-muted">One touch. Skip whenever you like.</p>
        </div>
        <div>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Mood · optional</p>
          <div className="flex items-center gap-3">
            {MOODS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setMoodKey((current) => (current === option.key ? undefined : option.key))}
                aria-label={`Mood: ${option.name}`}
                aria-pressed={moodKey === option.key}
                className="size-[26px] rounded-full"
                style={{
                  background: option.bg,
                  boxShadow: moodKey === option.key ? "0 0 0 3px #f1eee7, 0 0 0 5px #1a1817" : undefined
                }}
              />
            ))}
          </div>
        </div>
        <AtmosphereField value={atmosphere} onChange={setAtmosphere} mood={moodKey ? moodByKey(moodKey) : undefined} />
        <label className="block rounded-[16px] border border-border bg-[#fbf9f4] p-4">
          <span className="font-serif text-lg italic text-muted">Anything worth keeping?</span>
          <textarea value={fragment} onChange={(event) => setFragment(event.target.value)} rows={3} className="mt-2 w-full resize-none bg-transparent text-base leading-7 outline-none" placeholder="Leave a fragment…" />
        </label>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => window.location.replace(returnTo)} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Skip</button>
          <button type="button" onClick={finish} disabled={saving} className="tap-scale rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Done"}
          </button>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>
    );
  }

  return (
    <form className="space-y-5" onSubmit={capture}>
      <PhotoUploader onFilesChange={setFiles} onSourceChange={setPhotoSource} />

      <button
        type="button"
        onClick={() => setMoreOpen((open) => !open)}
        className="flex w-full items-center justify-between border-y border-border py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted"
        aria-expanded={moreOpen}
      >
        More <ChevronDown size={16} className={moreOpen ? "rotate-180" : ""} />
      </button>

      {moreOpen ? (
        <section className="grid gap-4 rounded-[22px] border border-border bg-surface-warm/80 p-4 sm:p-5">
          <CaptureField label="Dish or memory name"><input name="title" placeholder="Optional" className="entry-input" /></CaptureField>
          <div className="grid grid-cols-2 gap-3">
            <CaptureField label="Kind">
              <select name="type" defaultValue="home" className="entry-input"><option value="home">Home</option><option value="restaurant">Restaurant</option><option value="travel">Travel</option><option value="recipe">Recipe</option></select>
            </CaptureField>
            <CaptureField label="Date"><input name="date" type="date" className="entry-input" /></CaptureField>
            <CaptureField label="Place"><input name="place" placeholder="At home · Angel" className="entry-input" /></CaptureField>
            <CaptureField label="City"><input name="city" className="entry-input" /></CaptureField>
            <CaptureField label="Restaurant"><input name="restaurant" className="entry-input" /></CaptureField>
            <CaptureField label="Country"><input name="country" className="entry-input" /></CaptureField>
          </div>
          <CaptureField label="Ingredients"><textarea name="ingredients" rows={4} className="entry-input py-3" /></CaptureField>
          <CaptureField label="How we made it"><textarea name="method" rows={5} className="entry-input py-3" /></CaptureField>
          <label className="flex items-center justify-between py-2 text-sm text-ink">
            Add this dish to SUNDAY
            <input type="checkbox" name="recreate" className="size-5 accent-ink" />
          </label>
        </section>
      ) : null}

      <button type="submit" disabled={saving || !files.length} className="tap-scale flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-base font-semibold text-white disabled:opacity-45">
        {saving ? <LoaderCircle className="animate-spin" size={18} /> : null}
        {saving ? "Saving this moment…" : "Save memory"}
      </button>
      <p className="text-center text-xs leading-5 text-muted">Only the photograph is required. Context can be added after it is safe.</p>
      {error ? <p className="text-center text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

function CaptureField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">{label}</span>{children}</label>;
}

function text(form: FormData, key: string) {
  return String(form.get(key) || "").trim() || undefined;
}

function defaultTitle(date: Date) {
  const part = daypartFor(date.getHours());
  return `${part[0].toUpperCase()}${part.slice(1)} at the table`;
}

function daypartFor(hour: number): NonNullable<FoodEntry["daypart"]> {
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/add") || value.startsWith("/login")) return "/";
  return value;
}

async function cleanupUploadedPhotos(photos: FoodPhoto[]) {
  const paths = photos.map((photo) => photo.storagePath).filter(Boolean) as string[];
  if (paths.length) await createClient()?.storage.from("food-photos").remove(paths);
}

async function notifyGroupOfNewEntry(entryId: string) {
  try {
    await fetch("/api/notifications/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId }), keepalive: true });
  } catch {
    // Notifications are best effort and never block saving.
  }
}
