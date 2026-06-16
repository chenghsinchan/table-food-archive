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

  if (entry.photos.length) {
    const { error: deletePhotosError } = await supabase.from("photos").delete().eq("food_entry_id", entry.id);

    if (deletePhotosError) {
      throw deletePhotosError;
    }

    const { error: photoError } = await supabase.from("photos").insert(
      entry.photos.map((photo) => ({
        food_entry_id: entry.id,
        image_url: photo.imageUrl,
        thumbnail_url: photo.thumbnailUrl ?? photo.imageUrl,
        uploaded_by: null
      }))
    );

    if (photoError) {
      throw photoError;
    }
  }

  if (!entry.tags.length) {
    return;
  }

  const { data: tagRows, error: tagError } = await supabase
    .from("tags")
    .upsert(entry.tags.map((name) => ({ name })), { onConflict: "name" })
    .select("id,name");

  if (tagError) {
    throw tagError;
  }

  if (!tagRows?.length) {
    return;
  }

  const { error: deleteRelationsError } = await supabase.from("food_entry_tags").delete().eq("food_entry_id", entry.id);

  if (deleteRelationsError) {
    throw deleteRelationsError;
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
