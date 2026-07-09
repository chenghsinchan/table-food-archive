import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealPlanItem } from "@/types/food";

type MealPlanRow = {
  id: string;
  group_id: string;
  food_entry_id: string;
  week_start: string;
  day_of_week: number;
  portions: number;
  is_leftover: boolean;
  position: number;
};

function transformItem(row: MealPlanRow): MealPlanItem {
  return {
    id: row.id,
    groupId: row.group_id,
    foodEntryId: row.food_entry_id,
    weekStart: row.week_start,
    dayOfWeek: row.day_of_week,
    portions: row.portions,
    isLeftover: row.is_leftover,
    position: row.position
  };
}

function friendlyError(error: { message?: string; code?: string }) {
  if (error.code === "42P01" || error.message?.includes("meal_plan_items")) {
    return new Error("The meal planner table is missing. Run supabase/sunday-meal-plan.sql in the Supabase SQL Editor once.");
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
    .select("id, group_id, food_entry_id, week_start, day_of_week, portions, is_leftover, position")
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

export async function addMealPlanItem(
  supabase: SupabaseClient,
  input: {
    groupId: string;
    foodEntryId: string;
    weekStart: string;
    dayOfWeek: number;
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
      portions: input.portions ?? 2,
      created_by: input.createdBy ?? null
    })
    .select("id, group_id, food_entry_id, week_start, day_of_week, portions, is_leftover, position")
    .single();

  if (error) {
    throw friendlyError(error);
  }

  return transformItem(data as MealPlanRow);
}

export async function updateMealPlanItem(
  supabase: SupabaseClient,
  itemId: string,
  changes: { dayOfWeek?: number; portions?: number; isLeftover?: boolean }
): Promise<void> {
  const payload: Record<string, number | boolean> = {};

  if (changes.dayOfWeek !== undefined) payload.day_of_week = changes.dayOfWeek;
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
