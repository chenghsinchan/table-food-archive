"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Minus, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import type { FoodEntry, MealPlanItem } from "@/types/food";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { useGroups } from "@/lib/groups/GroupProvider";
import { createClient } from "@/lib/supabase/client";
import {
  addMealPlanItem,
  getMealPlanItems,
  removeMealPlanItem,
  updateMealPlanItem
} from "@/lib/supabase/meal-plan";
import { cn } from "@/lib/utils/cn";
import { thumbnailSrc } from "@/lib/utils/photos";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function startOfWeek(date: Date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sinceMonday = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - sinceMonday);
  return local;
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.toLocaleDateString("en-GB", { month: "short" });
  const endMonth = weekEnd.toLocaleDateString("en-GB", { month: "short" });

  if (startMonth === endMonth) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${endMonth}`;
  }

  return `${weekStart.getDate()} ${startMonth} – ${weekEnd.getDate()} ${endMonth}`;
}

function ingredientLines(entry: FoodEntry | undefined) {
  if (!entry?.ingredients) {
    return [];
  }

  return entry.ingredients
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

type DragState = {
  item: MealPlanItem;
  x: number;
  y: number;
  overDay: number | null;
};

export function SundayExperience() {
  const { entries, status: entriesStatus } = useFoodEntries();
  const { activeGroupId, status: groupStatus } = useGroups();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekKey = toDateKey(weekStart);

  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const busyRef = useRef(false);

  const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const editingItem = items.find((item) => item.id === editingItemId) ?? null;
  const todayKey = toDateKey(new Date());

  const loadItems = useCallback(async () => {
    const supabase = createClient();

    if (!supabase || !activeGroupId) {
      // Local preview / no group yet: plan lives only on this device this session.
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      setItems(await getMealPlanItems(supabase, activeGroupId, weekKey));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this week's plan.");
    } finally {
      setLoading(false);
    }
  }, [activeGroupId, weekKey]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function addDish(entry: FoodEntry, dayOfWeek: number) {
    if (busyRef.current) return;
    busyRef.current = true;
    setError("");

    try {
      const supabase = createClient();

      if (supabase && activeGroupId) {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        const item = await addMealPlanItem(supabase, {
          groupId: activeGroupId,
          foodEntryId: entry.id,
          weekStart: weekKey,
          dayOfWeek,
          createdBy: user?.id ?? null
        });
        setItems((current) => [...current, item]);
      } else {
        setItems((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            groupId: activeGroupId ?? "local",
            foodEntryId: entry.id,
            weekStart: weekKey,
            dayOfWeek,
            portions: 2,
            isLeftover: false,
            position: current.length
          }
        ]);
      }

      setPickerDay(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add this dish.");
    } finally {
      busyRef.current = false;
    }
  }

  async function changeItem(itemId: string, changes: { dayOfWeek?: number; portions?: number; isLeftover?: boolean }) {
    setError("");
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              dayOfWeek: changes.dayOfWeek ?? item.dayOfWeek,
              portions: changes.portions ?? item.portions,
              isLeftover: changes.isLeftover ?? item.isLeftover
            }
          : item
      )
    );

    const supabase = createClient();

    if (supabase && activeGroupId) {
      try {
        await updateMealPlanItem(supabase, itemId, changes);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save that change.");
        loadItems();
      }
    }
  }

  async function removeItem(itemId: string) {
    setError("");
    setItems((current) => current.filter((item) => item.id !== itemId));
    setEditingItemId(null);

    const supabase = createClient();

    if (supabase && activeGroupId) {
      try {
        await removeMealPlanItem(supabase, itemId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not remove this dish.");
        loadItems();
      }
    }
  }

  // ---- drag a planned dish between days (start from the grip handle) ----
  function dayFromPoint(x: number, y: number) {
    const target = document.elementFromPoint(x, y)?.closest("[data-day]");
    return target ? Number((target as HTMLElement).dataset.day) : null;
  }

  function handleDragStart(event: React.PointerEvent<HTMLButtonElement>, item: MealPlanItem) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ item, x: event.clientX, y: event.clientY, overDay: item.dayOfWeek });
  }

  function handleDragMove(event: React.PointerEvent<HTMLButtonElement>) {
    setDrag((current) =>
      current ? { ...current, x: event.clientX, y: event.clientY, overDay: dayFromPoint(event.clientX, event.clientY) } : current
    );
  }

  function handleDragEnd() {
    setDrag((current) => {
      if (current && current.overDay !== null && current.overDay !== current.item.dayOfWeek) {
        changeItem(current.item.id, { dayOfWeek: current.overDay });
      }

      return null;
    });
  }

  // ---- shopping list: total portions per dish, skipping leftovers ----
  const shoppingList = useMemo(() => {
    const totals = new Map<string, { entry: FoodEntry; portions: number }>();

    for (const item of items) {
      if (item.isLeftover) continue;

      const entry = entriesById.get(item.foodEntryId);
      if (!entry) continue;

      const existing = totals.get(entry.id);
      totals.set(entry.id, { entry, portions: (existing?.portions ?? 0) + item.portions });
    }

    return Array.from(totals.values());
  }, [items, entriesById]);

  const showSkeleton = (loading && !items.length) || (entriesStatus !== "error" && !entries.length && entriesStatus !== "ready");

  return (
    <main className="relative mx-auto w-full max-w-[760px] px-4 pb-10 pt-1 sm:px-6">
      <header className="flex w-full items-end justify-between gap-4 pb-5 pt-2">
        <h1 className="table-wordmark text-[58px] leading-none text-ink sm:text-[86px]">TABLE</h1>
        <div className="flex items-center pb-1">
          <ProfileButton />
        </div>
      </header>

      <div className="flex items-center justify-between pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">Sunday</p>
          <h2 className="font-serif text-3xl italic leading-tight text-ink">{formatWeekRange(weekStart)}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            className="tap-scale grid size-11 place-items-center rounded-full text-ink"
            aria-label="Previous week"
          >
            <ChevronLeft aria-hidden="true" size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="tap-scale rounded-full bg-surface-warm px-3 py-2 text-xs font-semibold text-ink"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            className="tap-scale grid size-11 place-items-center rounded-full text-ink"
            aria-label="Next week"
          >
            <ChevronRight aria-hidden="true" size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {groupStatus === "no-group" ? (
        <p className="rounded-lg border border-border bg-white/72 p-6 text-center text-sm leading-6 text-muted">
          Join or create a group first — the weekly plan is shared with your group.
        </p>
      ) : showSkeleton ? (
        <div className="space-y-3">
          {DAY_LABELS.map((label) => (
            <div key={label} className="h-16 animate-pulse rounded-[18px] border border-border bg-white/60" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {DAY_LABELS.map((label, dayIndex) => {
            const date = addDays(weekStart, dayIndex);
            const isToday = toDateKey(date) === todayKey;
            const dayItems = items.filter((item) => item.dayOfWeek === dayIndex);

            return (
              <section
                key={label}
                data-day={dayIndex}
                className={cn(
                  "rounded-[18px] border bg-white/72 p-4 transition",
                  drag && drag.overDay === dayIndex ? "border-ink bg-surface-warm" : "border-border"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    {label}
                    <span className={cn("ml-2", isToday && "rounded-full bg-ink px-2 py-0.5 text-white")}>
                      {date.getDate()} {date.toLocaleDateString("en-GB", { month: "short" })}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setPickerDay(dayIndex)}
                    className="tap-scale grid size-9 place-items-center rounded-full bg-surface-warm text-ink"
                    aria-label={`Add a dish to ${label}`}
                  >
                    <Plus aria-hidden="true" size={17} strokeWidth={2.1} />
                  </button>
                </div>

                {dayItems.length ? (
                  <ul className="mt-3 space-y-2">
                    {dayItems.map((item) => {
                      const entry = entriesById.get(item.foodEntryId);

                      if (!entry) {
                        return null;
                      }

                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 rounded-[14px] border border-border bg-white p-2 pr-3",
                            drag?.item.id === item.id && "opacity-40"
                          )}
                        >
                          <button
                            type="button"
                            onPointerDown={(event) => handleDragStart(event, item)}
                            onPointerMove={handleDragMove}
                            onPointerUp={handleDragEnd}
                            onPointerCancel={handleDragEnd}
                            className="grid size-9 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
                            aria-label={`Drag ${entry.title} to another day`}
                          >
                            <GripVertical aria-hidden="true" size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(item.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <img
                              src={thumbnailSrc(entry.photos[0])}
                              alt=""
                              loading="lazy"
                              className="size-11 shrink-0 rounded-[10px] object-cover"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{entry.title}</span>
                              <span className="block font-mono text-xs text-muted">
                                ×{item.portions}
                                {item.isLeftover ? " · leftover" : ""}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">Nothing planned.</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {error ? <p className="mt-4 text-center text-sm leading-6 text-ink">{error}</p> : null}

      {/* ---- weekly shopping list ---- */}
      {shoppingList.length ? (
        <section className="mt-6 rounded-[18px] border border-border bg-white/72 p-4">
          <button
            type="button"
            onClick={() => setShowShoppingList((current) => !current)}
            className="flex w-full items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted">
              <ShoppingBasket aria-hidden="true" size={16} />
              Shopping list
            </span>
            <span className="font-mono text-xs text-muted">{showShoppingList ? "Hide" : "Show"}</span>
          </button>

          {showShoppingList ? (
            <div className="mt-4 space-y-4">
              {shoppingList.map(({ entry, portions }) => {
                const lines = ingredientLines(entry);

                return (
                  <div key={entry.id} className="border-t border-border pt-3">
                    <p className="text-sm font-semibold text-ink">
                      {entry.title} <span className="font-mono text-xs text-muted">×{portions}</span>
                    </p>
                    {lines.length ? (
                      <ul className="mt-1 space-y-0.5">
                        {lines.map((line, index) => (
                          <li key={index} className="text-sm leading-6 text-muted">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm leading-6 text-muted">
                        No ingredients noted yet — open this card in HOME, tap edit, and add them.
                      </p>
                    )}
                  </div>
                );
              })}
              <p className="border-t border-border pt-3 text-xs leading-5 text-muted">
                Leftover meals are skipped — they reuse what you already cooked.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ---- drag ghost ---- */}
      {drag ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-ink bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm"
          style={{ left: drag.x, top: drag.y }}
        >
          {entriesById.get(drag.item.foodEntryId)?.title ?? "Dish"}
        </div>
      ) : null}

      {/* ---- dish picker sheet ---- */}
      {pickerDay !== null ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-ink/55"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setPickerDay(null);
            }
          }}
        >
          <div className="max-h-[72dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#fffefa] p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-between pb-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Add to {DAY_LABELS[pickerDay]}
              </p>
              <button
                type="button"
                onClick={() => setPickerDay(null)}
                className="tap-scale grid size-10 place-items-center text-muted hover:text-ink"
                aria-label="Close picker"
              >
                <X aria-hidden="true" size={22} strokeWidth={1.9} />
              </button>
            </div>

            {entries.length ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => addDish(entry, pickerDay)}
                    className="tap-scale overflow-hidden rounded-[14px] border border-border bg-white text-left"
                  >
                    <img
                      src={thumbnailSrc(entry.photos[0])}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <span className="block truncate p-2 text-xs font-semibold text-ink">{entry.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="pb-6 text-center text-sm leading-6 text-muted">
                No food cards yet. Add meals in HOME first, then plan them here.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* ---- planned dish editor ---- */}
      {editingItem ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-ink/55"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingItemId(null);
            }
          }}
        >
          <div className="w-full rounded-t-[28px] bg-[#fffefa] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-4">
              <p className="min-w-0 flex-1 truncate pr-3 font-serif text-2xl italic text-ink">
                {entriesById.get(editingItem.foodEntryId)?.title ?? "Dish"}
              </p>
              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                className="tap-scale grid size-10 place-items-center text-muted hover:text-ink"
                aria-label="Done"
              >
                <X aria-hidden="true" size={22} strokeWidth={1.9} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-white p-3">
                <span className="text-sm font-medium text-ink">Portions</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => changeItem(editingItem.id, { portions: Math.max(1, editingItem.portions - 1) })}
                    className="tap-scale grid size-10 place-items-center rounded-full bg-surface-warm text-ink"
                    aria-label="Fewer portions"
                  >
                    <Minus aria-hidden="true" size={16} />
                  </button>
                  <span className="w-6 text-center text-base font-semibold text-ink">{editingItem.portions}</span>
                  <button
                    type="button"
                    onClick={() => changeItem(editingItem.id, { portions: Math.min(12, editingItem.portions + 1) })}
                    className="tap-scale grid size-10 place-items-center rounded-full bg-surface-warm text-ink"
                    aria-label="More portions"
                  >
                    <Plus aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => changeItem(editingItem.id, { isLeftover: !editingItem.isLeftover })}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-white p-3"
              >
                <span className="text-left">
                  <span className="block text-sm font-medium text-ink">Leftover</span>
                  <span className="block text-xs leading-5 text-muted">
                    Reusing an earlier meal — skipped in the shopping list.
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                    editingItem.isLeftover ? "bg-ink text-white" : "bg-surface-warm text-transparent"
                  )}
                >
                  ✓
                </span>
              </button>

              <button
                type="button"
                onClick={() => removeItem(editingItem.id)}
                className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
              >
                <Trash2 aria-hidden="true" size={16} />
                Remove from this week
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
