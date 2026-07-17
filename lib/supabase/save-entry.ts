import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodEntry } from "@/types/food";
import { canonicalTagKey, normalizeTagName, uniqueTagNames } from "@/lib/tags";

type SaveOptions = {
  createdById?: string | null;
};

export async function createEntryInSupabase(supabase: SupabaseClient, entry: FoodEntry, options: SaveOptions = {}) {
  const payload = {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    rating: entry.rating ?? null,
    notes: entry.notes ?? null,
    recipe: entry.recipe ?? null,
    cook_time_minutes: entry.timeMinutes ?? null,
    restaurant_name: entry.restaurantName ?? null,
    city: entry.city ?? null,
    country: entry.country ?? null,
    entry_date: entry.entryDate,
    entry_time: entry.entryTime ?? null,
    daypart: entry.daypart ?? null,
    temperature_c: entry.temperatureC ?? null,
    weather: entry.weather ?? null,
    atmosphere_x: entry.atmosphere?.x ?? null,
    atmosphere_y: entry.atmosphere?.y ?? null,
    mood: entry.mood ?? null,
    effort: entry.effort ?? null,
    place_label: entry.placeLabel ?? null,
    dish_id: entry.dishId ?? null,
    want_to_recreate: entry.wantToRecreate ?? false,
    is_loved: entry.isLoved ?? false,
    ingredients: entry.ingredients ?? null,
    group_id: entry.groupId ?? null,
    created_by: options.createdById ?? entry.createdById ?? null,
    is_archived: false
  };

  let { error: entryError } = await supabase.from("food_entries").insert(payload);

  // Keep the client deployable before the additive entry/dish migration is run.
  if (entryError && isMissingModernEntryColumn(entryError)) {
    const legacyPayload = legacyEntryPayload(payload);
    ({ error: entryError } = await supabase.from("food_entries").insert(legacyPayload));
  }

  if (entryError) {
    throw entryError;
  }

  try {
    await replacePhotos(supabase, entry, false);
    await replaceTags(supabase, entry);
  } catch (error) {
    await deleteEntryFromSupabase(supabase, entry.id);
    throw error;
  }
}

export async function saveEntryToSupabase(supabase: SupabaseClient, entry: FoodEntry, options: SaveOptions = {}) {
  const payload = {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    rating: entry.rating ?? null,
    notes: entry.notes ?? null,
    recipe: entry.recipe ?? null,
    restaurant_name: entry.restaurantName ?? null,
    city: entry.city ?? null,
    country: entry.country ?? null,
    entry_date: entry.entryDate,
    entry_time: entry.entryTime ?? null,
    daypart: entry.daypart ?? null,
    temperature_c: entry.temperatureC ?? null,
    weather: entry.weather ?? null,
    atmosphere_x: entry.atmosphere?.x ?? null,
    atmosphere_y: entry.atmosphere?.y ?? null,
    mood: entry.mood ?? null,
    effort: entry.effort ?? null,
    place_label: entry.placeLabel ?? null,
    dish_id: entry.dishId ?? null,
    want_to_recreate: entry.wantToRecreate ?? false,
    is_loved: entry.isLoved ?? false,
    ingredients: entry.ingredients ?? null,
    group_id: entry.groupId ?? null,
    created_by: options.createdById ?? entry.createdById ?? null,
    is_archived: false
  };

  let { error: entryError } = await supabase.from("food_entries").upsert(payload, { onConflict: "id" });

  if (entryError && isMissingModernEntryColumn(entryError)) {
    const legacyPayload = legacyEntryPayload(payload);
    ({ error: entryError } = await supabase.from("food_entries").upsert(legacyPayload, { onConflict: "id" }));
  }

  if (entryError) {
    throw entryError;
  }

  await replacePhotos(supabase, entry, true);
  await replaceTags(supabase, entry);
}

export async function setEntryLovedInSupabase(supabase: SupabaseClient, entryId: string, isLoved: boolean) {
  try {
    const { data, error } = await supabase
      .from("food_entries")
      .update({ is_loved: isLoved })
      .eq("id", entryId)
      .select("id");

    if (error) {
      // Older databases without the is_loved column: mirror the state with a Love tag instead.
      if (isMissingLovedColumnError(error)) {
        await setEntryLoveTagInSupabase(supabase, entryId, isLoved);
        return;
      }

      throw error;
    }

    // The update succeeded but changed no rows (row-level security blocked it, or the
    // row only lives as a Love tag). Fall back to the tag so LOVE still reflects the change.
    if (!data || data.length === 0) {
      await setEntryLoveTagInSupabase(supabase, entryId, isLoved);
    }
  } catch (caught) {
    // Supabase errors are plain objects, not Error instances — wrap them so the real
    // database message reaches the UI instead of a generic fallback.
    throw asError(caught);
  }
}

function asError(value: unknown) {
  if (value instanceof Error) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as { message?: string; details?: string; hint?: string };
    const message = [record.message, record.details, record.hint].filter(Boolean).join(" — ");

    return new Error(message || "Could not save this to LOVE.");
  }

  return new Error("Could not save this to LOVE.");
}

async function setEntryLoveTagInSupabase(supabase: SupabaseClient, entryId: string, isLoved: boolean) {
  const tagId = await findOrCreateLoveTagId(supabase);

  if (!tagId) {
    throw new Error("Could not find the LOVE tag.");
  }

  if (isLoved) {
    await addLoveTagToEntry(supabase, entryId, tagId);
    return;
  }

  const { error: relationError } = await supabase
    .from("food_entry_tags")
    .delete()
    .eq("food_entry_id", entryId)
    .eq("tag_id", tagId);

  if (relationError) {
    throw relationError;
  }
}

async function findOrCreateLoveTagId(supabase: SupabaseClient) {
  const existing = await findLoveTagId(supabase);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: "Love" })
    .select("id")
    .single();

  if (error) {
    if (isDuplicateError(error)) {
      return findLoveTagId(supabase);
    }

    throw error;
  }

  return data?.id as string | undefined;
}

async function findLoveTagId(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .eq("name", "Love")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id as string | undefined;
}

async function addLoveTagToEntry(supabase: SupabaseClient, entryId: string, tagId: string) {
  const { data: existingRelation, error: existingError } = await supabase
    .from("food_entry_tags")
    .select("food_entry_id")
    .eq("food_entry_id", entryId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingRelation) {
    return;
  }

  const { error } = await supabase
    .from("food_entry_tags")
    .insert({ food_entry_id: entryId, tag_id: tagId });

  if (error && !isDuplicateError(error)) {
    throw error;
  }
}

function isMissingLovedColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || Boolean(error.message?.includes("is_loved"));
}

function isMissingColumnError(error: { code?: string; message?: string }, columnName: string) {
  return error.code === "42703" || Boolean(error.message?.includes(columnName));
}

// Columns that only exist after supabase/memory-cards.sql has been run.
// Saves keep working on older databases by retrying without them.
const MODERN_ENTRY_COLUMNS = [
  "ingredients",
  "entry_time",
  "daypart",
  "temperature_c",
  "weather",
  "atmosphere_x",
  "atmosphere_y",
  "mood",
  "effort",
  "place_label",
  "dish_id"
];

function isMissingModernEntryColumn(error: { code?: string; message?: string }) {
  return MODERN_ENTRY_COLUMNS.some((column) => isMissingColumnError(error, column));
}

function legacyEntryPayload<T extends Record<string, unknown>>(payload: T) {
  const legacy: Record<string, unknown> = { ...payload };
  for (const key of MODERN_ENTRY_COLUMNS) {
    delete legacy[key];
  }
  return legacy;
}

function isDuplicateError(error: { code?: string }) {
  return error.code === "23505";
}

async function replacePhotos(supabase: SupabaseClient, entry: FoodEntry, removeUnusedStorage: boolean) {
  const { data: oldPhotoRows } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("food_entry_id", entry.id);
  const oldStoragePaths = ((oldPhotoRows ?? []) as Array<{ storage_path: string | null }>)
    .map((photo) => photo.storage_path)
    .filter(Boolean) as string[];
  const nextStoragePaths = new Set(entry.photos.map((photo) => photo.storagePath).filter(Boolean));

  const { error: deletePhotosError } = await supabase.from("photos").delete().eq("food_entry_id", entry.id);

  if (deletePhotosError) {
    throw deletePhotosError;
  }

  if (entry.photos.length) {
    const { error: photoError } = await supabase.from("photos").insert(
      entry.photos.map((photo) => ({
        food_entry_id: entry.id,
        image_url: photo.imageUrl,
        thumbnail_url: photo.thumbnailUrl ?? photo.imageUrl,
        storage_path: photo.storagePath ?? null,
        uploaded_by: null
      }))
    );

    if (photoError) {
      throw photoError;
    }
  }

  const removedStoragePaths = oldStoragePaths.filter((path) => !nextStoragePaths.has(path));

  if (removeUnusedStorage && removedStoragePaths.length) {
    await supabase.storage.from("food-photos").remove(removedStoragePaths);
  }
}

async function replaceTags(supabase: SupabaseClient, entry: FoodEntry) {
  const { error: deleteRelationsError } = await supabase.from("food_entry_tags").delete().eq("food_entry_id", entry.id);

  if (deleteRelationsError) {
    throw deleteRelationsError;
  }

  if (!entry.tags.length) {
    return;
  }

  const uniqueTags = uniqueTagNames(entry.tags);

  if (!uniqueTags.length) {
    return;
  }

  const { data: existingRows, error: existingError } = await supabase.from("tags").select("id,name");

  if (existingError) {
    throw existingError;
  }

  const byKey = new Map(
    ((existingRows ?? []) as Array<{ id: string; name: string }>).map((tag) => [canonicalTagKey(tag.name), tag])
  );
  const missingTags = uniqueTags.filter((name) => !byKey.has(canonicalTagKey(name)));

  if (missingTags.length) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("tags")
      .upsert(missingTags.map((name) => ({ name: normalizeTagName(name) })), { onConflict: "name" })
      .select("id,name");

    if (insertError) {
      throw insertError;
    }

    for (const tag of (insertedRows ?? []) as Array<{ id: string; name: string }>) {
      byKey.set(canonicalTagKey(tag.name), tag);
    }
  }

  const tagRows = uniqueTags
    .map((name) => byKey.get(canonicalTagKey(name)))
    .filter(Boolean) as Array<{ id: string; name: string }>;

  if (!tagRows.length) {
    return;
  }

  const { error: relationError } = await supabase.from("food_entry_tags").upsert(
    tagRows.map((tag) => ({
      food_entry_id: entry.id,
      tag_id: tag.id
    })),
    { onConflict: "food_entry_id,tag_id" }
  );

  if (relationError) {
    throw relationError;
  }
}

export async function deleteEntryFromSupabase(supabase: SupabaseClient, entryId: string) {
  const { data: photoRows } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("food_entry_id", entryId);
  const storagePaths = ((photoRows ?? []) as Array<{ storage_path: string | null }>)
    .map((photo) => photo.storage_path)
    .filter(Boolean) as string[];

  const { error: tagError } = await supabase.from("food_entry_tags").delete().eq("food_entry_id", entryId);

  if (tagError) {
    throw tagError;
  }

  const { error: photoError } = await supabase.from("photos").delete().eq("food_entry_id", entryId);

  if (photoError) {
    throw photoError;
  }

  const { error: entryError } = await supabase.from("food_entries").delete().eq("id", entryId);

  if (entryError) {
    throw entryError;
  }

  if (storagePaths.length) {
    await supabase.storage.from("food-photos").remove(storagePaths);
  }
}
