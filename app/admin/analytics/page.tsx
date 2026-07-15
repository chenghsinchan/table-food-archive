import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OWNER_EMAIL } from "@/lib/groups/constants";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyActiveUsers,
  getEventCountsByDay,
  getEventCountsByType,
  getRecentEvents,
  getTotalEventCount,
  getTotalUsers,
  getWeeklyActiveUsers
} from "@/lib/supabase/analytics";
import { formatRelativeTime } from "@/lib/utils/date";
import type { AnalyticsEventName } from "@/types/analytics";

export const metadata: Metadata = {
  title: "Analytics"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EVENT_LABELS: Record<AnalyticsEventName, string> = {
  app_opened: "App opened",
  dish_added: "Dish added",
  dish_updated: "Dish updated",
  dish_deleted: "Dish deleted",
  meal_planned: "Meal planned",
  shopping_list_generated: "Shopping list opened",
  dish_marked_recreate: "Marked want to recreate",
  invite_sent: "Invite sent",
  group_created: "Archive created"
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-white/72 p-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-4xl italic text-ink">{value.toLocaleString()}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || (user.email ?? "").toLowerCase() !== OWNER_EMAIL) {
    redirect("/");
  }

  const [
    totalUsers,
    dailyActiveUsers,
    weeklyActiveUsers,
    totalEvents,
    eventCountsByType,
    dishesAddedByDay,
    recentActivity
  ] = await Promise.all([
    getTotalUsers(supabase),
    getDailyActiveUsers(supabase),
    getWeeklyActiveUsers(supabase),
    getTotalEventCount(supabase),
    getEventCountsByType(supabase),
    getEventCountsByDay(supabase, { eventName: "dish_added", days: 30 }),
    getRecentEvents(supabase, 20)
  ]);

  const countByEventName = new Map(eventCountsByType.map((row) => [row.eventName, row.count]));
  const maxEventTypeCount = Math.max(1, ...eventCountsByType.map((row) => row.count));
  const maxDailyDishes = Math.max(1, ...dishesAddedByDay.map((day) => day.count));

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-6 px-4 pb-10 pt-1 sm:px-6">
      <header className="space-y-3 pb-1 pt-2">
        <p className="text-xs font-semibold uppercase text-muted">Founder only</p>
        <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">Analytics</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total users" value={totalUsers} />
        <StatCard label="Active today" value={dailyActiveUsers} />
        <StatCard label="Active (7 days)" value={weeklyActiveUsers} />
        <StatCard label="Total events" value={totalEvents} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Meals planned" value={countByEventName.get("meal_planned") ?? 0} />
        <StatCard label="Shopping lists opened" value={countByEventName.get("shopping_list_generated") ?? 0} />
      </section>

      {/* ---- Events by type ---- */}
      <section className="rounded-lg border border-border bg-white/72 p-5">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted">Events by type</p>
        {eventCountsByType.length ? (
          <ul className="space-y-3">
            {eventCountsByType.map((row) => (
              <li key={row.eventName}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{EVENT_LABELS[row.eventName] ?? row.eventName}</span>
                  <span className="font-mono text-xs text-muted">{row.count.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-warm">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${Math.max(4, (row.count / maxEventTypeCount) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-muted">No events recorded yet.</p>
        )}
      </section>

      {/* ---- Dishes added over time ---- */}
      <section className="rounded-lg border border-border bg-white/72 p-5">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted">Dishes added — last 30 days</p>
        {dishesAddedByDay.some((day) => day.count > 0) ? (
          <div className="flex h-28 items-end gap-[3px]">
            {dishesAddedByDay.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count}`}
                className="min-w-[2px] flex-1 rounded-t bg-ink"
                style={{ height: `${Math.max(3, (day.count / maxDailyDishes) * 100)}%` }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted">No dishes added in the last 30 days.</p>
        )}
        {dishesAddedByDay.length ? (
          <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            <span>{dishesAddedByDay[0].date}</span>
            <span>{dishesAddedByDay[dishesAddedByDay.length - 1].date}</span>
          </div>
        ) : null}
      </section>

      {/* ---- Most recent activity ---- */}
      <section className="rounded-lg border border-border bg-white/72 p-5">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted">Most recent activity</p>
        {recentActivity.length ? (
          <ul className="divide-y divide-border">
            {recentActivity.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-ink">{EVENT_LABELS[event.eventName] ?? event.eventName}</span>
                  <span className="text-muted"> · {event.userName}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">{formatRelativeTime(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-muted">No activity yet.</p>
        )}
      </section>
    </div>
  );
}
