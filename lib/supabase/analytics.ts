import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsActivityItem, AnalyticsEvent, AnalyticsEventName, DailyCount, EventTypeCount } from "@/types/analytics";

const DAY_MS = 24 * 60 * 60 * 1000;

type EventRow = {
  id: string;
  user_id: string | null;
  event_name: AnalyticsEventName;
  properties: Record<string, unknown> | null;
  created_at: string;
};

function transformEvent(row: EventRow): AnalyticsEvent {
  return {
    id: row.id,
    userId: row.user_id,
    eventName: row.event_name,
    properties: row.properties ?? {},
    createdAt: row.created_at
  };
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Total signed-up users. Every user has a row in `profiles`. */
export async function getTotalUsers(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/** Distinct users who recorded at least one event in the last `days` days. */
async function getActiveUserCount(supabase: SupabaseClient, days: number): Promise<number> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("user_id")
    .gte("created_at", isoDaysAgo(days));

  if (error) {
    throw error;
  }

  const uniqueUserIds = new Set(
    ((data ?? []) as Array<{ user_id: string | null }>).map((row) => row.user_id).filter(Boolean)
  );

  return uniqueUserIds.size;
}

export async function getDailyActiveUsers(supabase: SupabaseClient): Promise<number> {
  return getActiveUserCount(supabase, 1);
}

export async function getWeeklyActiveUsers(supabase: SupabaseClient): Promise<number> {
  return getActiveUserCount(supabase, 7);
}

/** Total number of events ever recorded. */
export async function getTotalEventCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase.from("analytics_events").select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/** How many times each event has fired, most frequent first. */
export async function getEventCountsByType(supabase: SupabaseClient): Promise<EventTypeCount[]> {
  const { data, error } = await supabase.from("analytics_events").select("event_name");

  if (error) {
    throw error;
  }

  const counts = new Map<AnalyticsEventName, number>();

  for (const row of (data ?? []) as Array<{ event_name: AnalyticsEventName }>) {
    counts.set(row.event_name, (counts.get(row.event_name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([eventName, count]) => ({ eventName, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Day-bucketed counts for the last `days` days (default 30), optionally
 * filtered to one event name. Days with zero events are included as 0 so a
 * chart never has gaps.
 */
export async function getEventCountsByDay(
  supabase: SupabaseClient,
  options: { eventName?: AnalyticsEventName; days?: number } = {}
): Promise<DailyCount[]> {
  const days = options.days ?? 30;

  let query = supabase.from("analytics_events").select("created_at").gte("created_at", isoDaysAgo(days));

  if (options.eventName) {
    query = query.eq("event_name", options.eventName);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();

  for (const row of (data ?? []) as Array<{ created_at: string }>) {
    const key = toDateKey(row.created_at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series: DailyCount[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = toDateKey(isoDaysAgo(offset));
    series.push({ date, count: counts.get(date) ?? 0 });
  }

  return series;
}

/** The most recent events, with each user's display name resolved for the founder's view. */
export async function getRecentEvents(supabase: SupabaseClient, limit = 20): Promise<AnalyticsActivityItem[]> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("id, user_id, event_name, properties, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const events = ((data ?? []) as EventRow[]).map(transformEvent);
  const userIds = Array.from(new Set(events.map((event) => event.userId).filter(Boolean))) as string[];

  const profiles = new Map<string, string>();

  if (userIds.length) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);

    for (const row of (profileRows ?? []) as Array<{ id: string; display_name: string | null; email: string }>) {
      profiles.set(row.id, row.display_name || row.email?.split("@")[0] || "Someone");
    }
  }

  return events.map((event) => ({
    ...event,
    userName: (event.userId && profiles.get(event.userId)) || "Unknown"
  }));
}
