import type { FoodEntry, FoodPhoto } from "@/types/food";
import { seedEntries } from "@/lib/seed-data";
import { createClient } from "@/lib/supabase/server";

type PhotoRow = {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  storage_path?: string | null;
};

type TagRelationRow = {
  tags: {
    name: string;
  } | null;
};

type EntryRow = {
  id: string;
  title: string;
  type: "home" | "restaurant" | "travel" | "recipe";
  rating: number | null;
  notes: string | null;
  recipe: string | null;
  cook_time_minutes?: number | null;
  restaurant_name: string | null;
  city: string | null;
  country: string | null;
  entry_date: string;
  want_to_recreate?: boolean | null;
  is_loved?: boolean | null;
  group_id?: string | null;
  created_by: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  photos: PhotoRow[] | null;
  food_entry_tags: TagRelationRow[] | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
};

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "T"
  );
}

function transformEntry(row: EntryRow, profiles: Map<string, ProfileRow> = new Map()): FoodEntry {
  const photos: FoodPhoto[] = (row.photos ?? []).map((photo) => ({
    id: photo.id,
    imageUrl: photo.image_url,
    thumbnailUrl: photo.thumbnail_url ?? undefined,
    storagePath: photo.storage_path ?? undefined,
    alt: row.title
  }));

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    rating: row.rating ?? undefined,
    notes: row.notes ?? undefined,
    recipe: row.recipe ?? undefined,
    timeMinutes: row.cook_time_minutes ?? undefined,
    restaurantName: row.restaurant_name ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    entryDate: row.entry_date,
    wantToRecreate: row.want_to_recreate ?? false,
    isLoved: (row.is_loved ?? false) || (row.food_entry_tags ?? []).some((relation) => relation.tags?.name === "Love"),
    groupId: row.group_id ?? undefined,
    createdById: row.created_by ?? undefined,
    addedBy: row.created_by
      ? (() => {
          const profile = profiles.get(row.created_by);
          const name = profile?.display_name || profile?.email?.split("@")[0] || "TABLE";

          return {
            name,
            initials: initialsFor(name),
            avatarUrl: profile?.avatar_url ?? undefined
          };
        })()
      : undefined,
    tags: (row.food_entry_tags ?? []).map((relation) => relation.tags?.name).filter(Boolean) as string[],
    photos:
      photos.length > 0
        ? photos
        : [
            {
              id: `${row.id}-placeholder`,
              imageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&h=1200&q=82",
              alt: row.title
            }
          ]
  };
}

async function getProfilesForEntries(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  rows: EntryRow[]
) {
  const ids = Array.from(new Set(rows.map((row) => row.created_by).filter(Boolean))) as string[];

  if (!ids.length) {
    return new Map<string, ProfileRow>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url")
    .in("id", ids);

  return new Map((data as ProfileRow[] | null | undefined)?.map((profile) => [profile.id, profile]) ?? []);
}

export async function getFoodEntries(groupId?: string) {
  const supabase = await createClient();

  if (!supabase) {
    return seedEntries;
  }

  let query = supabase
    .from("food_entries")
    .select("*, photos(id,image_url,thumbnail_url,storage_path), food_entry_tags(tags(name))")
    .eq("is_archived", false);

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query.order("entry_date", { ascending: false });

  if (error) {
    return [];
  }

  const rows = (data ?? []) as EntryRow[];
  if (!rows.length) {
    return [];
  }

  const profiles = await getProfilesForEntries(supabase, rows);

  return dedupeEntryRows(rows).map((row) => transformEntry(row, profiles));
}

export async function getFoodEntryById(id: string) {
  const supabase = await createClient();

  if (!supabase) {
    return seedEntries.find((entry) => entry.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("food_entries")
    .select("*, photos(id,image_url,thumbnail_url,storage_path), food_entry_tags(tags(name))")
    .eq("id", id)
    .eq("is_archived", false)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as EntryRow;
  const profiles = await getProfilesForEntries(supabase, [row]);

  return transformEntry(row, profiles);
}

function dedupeEntryRows(rows: EntryRow[]) {
  const seen = new Set<string>();

  return [...rows]
    .sort((a, b) => {
      const aTime = new Date(a.updated_at ?? a.created_at ?? `${a.entry_date}T12:00:00`).getTime();
      const bTime = new Date(b.updated_at ?? b.created_at ?? `${b.entry_date}T12:00:00`).getTime();

      return bTime - aTime;
    })
    .filter((row) => {
      const key = [
        row.title.trim().toLowerCase(),
        row.entry_date,
        row.type,
        (row.notes ?? "").trim().toLowerCase(),
        (row.recipe ?? "").trim().toLowerCase()
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(`${b.entry_date}T12:00:00`).getTime() - new Date(`${a.entry_date}T12:00:00`).getTime());
}
