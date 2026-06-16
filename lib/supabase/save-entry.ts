import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodEntry } from "@/types/food";

export async function saveEntryToSupabase(supabase: SupabaseClient, entry: FoodEntry) {
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
        created_by: null,
        is_archived: false
      },
      { onConflict: "id" }
    );

  if (entryError) {
    throw entryError;
  }

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

  if (removedStoragePaths.length) {
    await supabase.storage.from("food-photos").remove(removedStoragePaths);
  }

  const { error: deleteRelationsError } = await supabase.from("food_entry_tags").delete().eq("food_entry_id", entry.id);

  if (deleteRelationsError) {
    throw deleteRelationsError;
  }

  if (!entry.tags.length) {
    return;
  }

  const uniqueTags = Array.from(
    new Map(entry.tags.map((name) => [canonicalTagKey(name), name.trim()])).values()
  ).filter(Boolean);

  if (!uniqueTags.length) {
    return;
  }

  const { data: tagRows, error: tagError } = await supabase
    .from("tags")
    .upsert(uniqueTags.map((name) => ({ name })), { onConflict: "name" })
    .select("id,name");

  if (tagError) {
    throw tagError;
  }

  if (!tagRows?.length) {
    return;
  }

  const { error: relationError } = await supabase.from("food_entry_tags").insert(
    tagRows.map((tag) => ({
      food_entry_id: entry.id,
      tag_id: tag.id
    }))
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

function canonicalTagKey(tag: string) {
  const key = tag.trim().toLowerCase();

  return key === "favorites" ? "favorite" : key;
}
