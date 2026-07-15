import type { MealSlot } from "@/types/food";

/**
 * The full, closed set of events TABLE records. Keep this list in sync with
 * the `analytics_events_event_name_check` constraint in
 * supabase/analytics-events.sql — adding an event means adding it in both
 * places.
 */
export type AnalyticsEventName =
  | "app_opened"
  | "dish_added"
  | "dish_updated"
  | "dish_deleted"
  | "meal_planned"
  | "shopping_list_generated"
  | "dish_marked_recreate"
  | "invite_sent"
  | "group_created";

/** Where a photo came from when a dish was added. Anonymous — not a photo. */
export type PhotoSource = "camera" | "library" | "drop";

/**
 * Per-event property shapes. Every field here must be an ID or small
 * anonymous metadata (a count, an enum) — never a title, note, ingredient
 * list, photo, or location. `trackEvent()` is typed against this map so a
 * call site can't accidentally pass the wrong shape (or real content) for a
 * given event.
 */
export type AnalyticsEventPropertiesMap = {
  app_opened: Record<string, never>;
  dish_added: { groupId?: string; dishId: string; source: PhotoSource };
  dish_updated: { dishId: string; groupId?: string };
  dish_deleted: { dishId: string; groupId?: string };
  meal_planned: { groupId?: string; dishId: string; mealSlot: MealSlot; dayOfWeek: number };
  shopping_list_generated: { groupId?: string; mealCount: number; ingredientCount: number };
  dish_marked_recreate: { dishId: string; groupId?: string };
  invite_sent: Record<string, never>;
  group_created: { groupId: string; source: "manual" | "auto_personal" };
};

/** A stored event, as read back by the founder-only analytics dashboard. */
export type AnalyticsEvent = {
  id: string;
  userId: string | null;
  eventName: AnalyticsEventName;
  properties: Record<string, unknown>;
  createdAt: string;
};

/** One row of "recent activity" — an event plus who did it, for display only. */
export type AnalyticsActivityItem = AnalyticsEvent & {
  userName: string;
};

export type EventTypeCount = {
  eventName: AnalyticsEventName;
  count: number;
};

/** One day's event count — used for any day-bucketed chart (dishes added, etc). */
export type DailyCount = {
  date: string;
  count: number;
};

export type AnalyticsOverview = {
  totalUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  totalEvents: number;
};
