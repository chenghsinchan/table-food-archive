import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodEntry } from "@/types/food";

export async function saveEntryToSupabase(supabase: SupabaseClient, entry: FoodEntry) {
  const { error: entryError } = await supabase.from("food_entries").insert({
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
    created_by: null
  });

  if (entryError) {
    throw entryError;
  }

  if (entry.photos.length) {
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
