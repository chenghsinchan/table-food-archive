import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealPlanItem, MealSlot } from "@/types/food";

type MealPlanRow = {
  id: string;
  group_id: string;
  food_entry_id: string;
  week_start: string;
  day_of_week: number;
  meal_slot: MealSlot | null;
  portions: number;
  is_leftover: boolean;
  position: number;
};

const SELECT_COLUMNS = "id, group_id, food_entry_id, week_start, day_of_week, meal_slot, portions, is_leftover, position";

function transformItem(row: MealPlanRow): MealPlanItem {
  return {
    id: row.id,
    groupId: row.group_id,
    foodEntryId: row.food_entry_id,
    weekStart: row.week_start,
    dayOfWeek: row.day_of_week,
    mealSlot: row.meal_slot ?? "dinner",
    portions: row.portions,
    isLeftover: row.is_leftover,
    position: row.position
  };
}

function friendlyError(error: { message?: string; code?: string }) {
  if (error.code === "42P01" || error.message?.includes("meal_plan_items") || error.message?.includes("meal_slot")) {
    return new Error("The meal planner needs a database update. Run supabase/sunday-meal-plan.sql in the Supabase SQL Editor once.");
  }

  return new Error(error.message || "Could not update the meal plan.");
}

export async function getMealPlanItems(
  supabase: SupabaseClient,
  groupId: string,
  weekStart: string
): Promise<MealPlanItem[]> {
  const { data, error } = await supabase
    .from("meal_plan_items")
    .select(SELECT_COLUMNS)
    .eq("group_id", groupId)
    .eq("week_start", weekStart)
    .order("day_of_week", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw friendlyError(error);
  }

  return ((data ?? []) as MealPlanRow[]).map(transformItem);
}

/** Items for several weeks at once (used by the month view). */
export async function getMealPlanItemsForWeeks(
  supabase: SupabaseClient,
  groupId: string,
  weekStarts: string[]
): Promise<MealPlanItem[]> {
  if (!weekStarts.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("meal_plan_items")
    .select(SELECT_COLUMNS)
    .eq("group_id", groupId)
    .in("week_start", weekStarts)
    .order("day_of_week", { ascending: true })
    .order("position", { ascending: true });

  if (error) {
    throw friendlyError(error);
  }

  return ((data ?? []) as MealPlanRow[]).map(transformItem);
}

export async function addMealPlanItem(
  supabase: SupabaseClient,
  input: {
    groupId: string;
    foodEntryId: string;
    weekStart: string;
    dayOfWeek: number;
    mealSlot: MealSlot;
    portions?: number;
    createdBy?: string | null;
  }
): Promise<MealPlanItem> {
  const { data, error } = await supabase
    .from("meal_plan_items")
    .insert({
      group_id: input.groupId,
      food_entry_id: input.foodEntryId,
      week_start: input.weekStart,
      day_of_week: input.dayOfWeek,
      meal_slot: input.mealSlot,
      portions: input.portions ?? 2,
      created_by: input.createdBy ?? null
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw friendlyError(error);
  }

  return transformItem(data as MealPlanRow);
}

/** Copy a set of planned meals into another week (used by copy/paste week). */
export async function copyMealPlanItems(
  supabase: SupabaseClient,
  items: MealPlanItem[],
  targetWeekStart: string,
  createdBy?: string | null
): Promise<MealPlanItem[]> {
  if (!items.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("meal_plan_items")
    .insert(
      items.map((item) => ({
        group_id: item.groupId,
        food_entry_id: item.foodEntryId,
        week_start: targetWeekStart,
        day_of_week: item.dayOfWeek,
        meal_slot: item.mealSlot,
        portions: item.portions,
        is_leftover: item.isLeftover,
        position: item.position,
        created_by: createdBy ?? null
      }))
    )
    .select(SELECT_COLUMNS);

  if (error) {
    throw friendlyError(error);
  }

  return ((data ?? []) as MealPlanRow[]).map(transformItem);
}

export async function updateMealPlanItem(
  supabase: SupabaseClient,
  itemId: string,
  changes: { dayOfWeek?: number; mealSlot?: MealSlot; portions?: number; isLeftover?: boolean }
): Promise<void> {
  const payload: Record<string, number | boolean | string> = {};

  if (changes.dayOfWeek !== undefined) payload.day_of_week = changes.dayOfWeek;
  if (changes.mealSlot !== undefined) payload.meal_slot = changes.mealSlot;
  if (changes.portions !== undefined) payload.portions = changes.portions;
  if (changes.isLeftover !== undefined) payload.is_leftover = changes.isLeftover;

  if (!Object.keys(payload).length) {
    return;
  }

  const { error } = await supabase.from("meal_plan_items").update(payload).eq("id", itemId);

  if (error) {
    throw friendlyError(error);
  }
}

export async function removeMealPlanItem(supabase: SupabaseClient, itemId: string): Promise<void> {
  const { error } = await supabase.from("meal_plan_items").delete().eq("id", itemId);

  if (error) {
    throw friendlyError(error);
  }
}
