import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodEntry } from "@/types/food";
import { canonicalTagKey, normalizeTagName, uniqueTagNames } from "@/lib/tags";

type SaveOptions = {
  createdById?: string | null;
};

export async function createEntryInSupabase(supabase: SupabaseClient, entry: FoodEntry, options: SaveOptions = {}) {
  const { error: entryError } = await supabase.from("food_entries").insert({
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
    want_to_recreate: entry.wantToRecreate ?? false,
    is_loved: entry.isLoved ?? false,
    created_by: options.createdById ?? entry.createdById ?? null,
    is_archived: false
  });

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
  const { error: entryError } = await supabase
    .from("food_entries")
    .upsert(
      {
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
        want_to_recreate: entry.wantToRecreate ?? false,
        is_loved: entry.isLoved ?? false,
        created_by: options.createdById ?? entry.createdById ?? null,
        is_archived: false
      },
      { onConflict: "id" }
    );

  if (entryError) {
    throw entryError;
  }

  await replacePhotos(supabase, entry, true);
  await replaceTags(supabase, entry);
}

export async function setEntryLovedInSupabase(supabase: SupabaseClient, entryId: string, isLoved: boolean) {
  const { error } = await supabase
    .from("food_entries")
    .update({ is_loved: isLoved })
    .eq("id", entryId);

  if (error) {
    throw error;
  }
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
