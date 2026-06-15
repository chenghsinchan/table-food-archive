"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadFoodPhotos } from "@/lib/supabase/storage";
import { RatingInput } from "@/components/ui/RatingInput";
import { TagPill } from "@/components/ui/TagPill";
import { PhotoUploader } from "@/components/upload/PhotoUploader";
import type { EntryType } from "@/types/food";

const suggestedTags = [
  "Comfort",
  "Quick",
  "Seafood",
  "Taiwanese",
  "Japanese",
  "Lithuanian",
  "Pasta",
  "Favorite",
  "Vegetarian",
  "Light",
  "Rich"
];
const entryTypes: EntryType[] = ["home", "restaurant", "travel", "recipe"];

export function EntryForm() {
  const searchParams = useSearchParams();
  const [rating, setRating] = useState(0);
  const [type, setType] = useState<EntryType>("home");
  const [wantToRecreate, setWantToRecreate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const returnTo = safeReturnPath(searchParams.get("returnTo"));

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  function addCustomTag() {
    const tag = customTag.trim();

    if (!tag) {
      return;
    }

    setTags((current) => {
      const exists = current.some((item) => item.toLowerCase() === tag.toLowerCase());
      return exists ? current : [...current, tag];
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

    const supabase = createClient();

    if (!supabase) {
      setError("Saving is not connected in this copy yet.");
      return;
    }

    setStatus("saving");

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const { data: entry, error: entryError } = await supabase
        .from("food_entries")
        .insert({
          title,
          type,
          rating: rating || null,
          notes: String(form.get("notes") || "").trim() || null,
          recipe: String(form.get("recipe") || "").trim() || null,
          restaurant_name: String(form.get("restaurant") || "").trim() || null,
          city: String(form.get("city") || "").trim() || null,
          country: String(form.get("country") || "").trim() || null,
          entry_date: String(form.get("date") || "").trim() || new Date().toISOString().slice(0, 10),
          want_to_recreate: wantToRecreate,
          created_by: user?.id ?? null
        })
        .select("id")
        .single();

      if (entryError || !entry) {
        throw entryError ?? new Error("Could not create entry.");
      }

      const uploadedPhotos = await uploadFoodPhotos({ supabase, entryId: entry.id, files });
      const { error: photoError } = await supabase.from("photos").insert(
        uploadedPhotos.map((photo) => ({
          food_entry_id: entry.id,
          ...photo,
          uploaded_by: user?.id ?? null
        }))
      );

      if (photoError) {
        throw photoError;
      }

      if (tags.length) {
        const { data: tagRows, error: tagError } = await supabase
          .from("tags")
          .upsert(tags.map((name) => ({ name })), { onConflict: "name" })
          .select("id,name");

        if (!tagError && tagRows?.length) {
          await supabase.from("food_entry_tags").insert(
            tagRows.map((tag) => ({
              food_entry_id: entry.id,
              tag_id: tag.id
            }))
          );
        }
      }

      setStatus("saved");
      window.location.replace(returnTo);
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "Something went wrong while saving.");
    }
  }

  return (
    <form className="space-y-5" onSubmit={saveEntry}>
      <PhotoUploader onFilesChange={setFiles} />

      <section className="rounded-lg bg-white/72 p-4 shadow-[0_18px_48px_rgba(18,21,21,0.08)] sm:p-5">
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

          <div className="grid gap-2">
            <span className="text-sm font-medium text-muted">Rating</span>
            <RatingInput value={rating} onChange={setRating} />
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
                <TagPill key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {tag}
                </TagPill>
              ))}
              {tags.filter((tag) => !suggestedTags.includes(tag)).map((tag) => (
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
        disabled={status === "saving"}
        className="tap-scale flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-base font-semibold text-white shadow-[0_18px_48px_rgba(18,21,21,0.18)] disabled:cursor-wait disabled:opacity-70"
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
