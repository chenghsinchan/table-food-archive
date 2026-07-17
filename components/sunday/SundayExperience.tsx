"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Copy,
  GripVertical,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
  X
} from "lucide-react";
import type { FoodEntry, MealPlanItem, MealSlot } from "@/types/food";
import { ArchivePageTabs } from "@/components/navigation/ArchivePageTabs";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { useGroups } from "@/lib/groups/GroupProvider";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import {
  addMealPlanItem,
  copyMealPlanItems,
  getMealPlanItems,
  getMealPlanItemsForWeeks,
  removeMealPlanItem,
  updateMealPlanItem
} from "@/lib/supabase/meal-plan";
import { cn } from "@/lib/utils/cn";
import { thumbnailSrc } from "@/lib/utils/photos";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const MEAL_SLOTS: Array<{ key: MealSlot; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" }
];

const SLOT_ORDER: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2 };

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

function fromDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
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

/** Mondays of every week that overlaps the given month. */
function weeksOfMonth(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const weeks: Date[] = [];
  let cursor = startOfWeek(firstOfMonth);

  while (cursor <= lastOfMonth) {
    weeks.push(cursor);
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

function entryMatchesSlot(entry: FoodEntry, slot: MealSlot) {
  return entry.tags.some((tag) => tag.trim().toLowerCase() === slot);
}

type DragState = {
  item: MealPlanItem;
  x: number;
  y: number;
  overDay: number | null;
  overSlot: MealSlot | null;
};

type CopyBuffer = {
  label: string;
  sourceKey: string;
  items: MealPlanItem[];
};

export function SundayExperience() {
  const { entries, status: entriesStatus } = useFoodEntries();
  const { activeGroupId, status: groupStatus } = useGroups();

  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekKey = toDateKey(weekStart);

  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picker, setPicker] = useState<{ day: number; slot: MealSlot } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [copyBuffer, setCopyBuffer] = useState<CopyBuffer | null>(null);
  const [weekMenu, setWeekMenu] = useState<string | null>(null);

  const [monthDate, setMonthDate] = useState(() => new Date());
  const [monthItems, setMonthItems] = useState<MealPlanItem[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [expandedMonthWeek, setExpandedMonthWeek] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => new Set());

  const busyRef = useRef(false);
  const longPressRef = useRef<{ timer: number | null; x: number; y: number; fired: boolean }>({
    timer: null,
    x: 0,
    y: 0,
    fired: false
  });

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

  // Today and tomorrow start open; every other day starts collapsed.
  useEffect(() => {
    const defaults = new Set<number>();
    const now = new Date();

    for (const date of [now, addDays(now, 1)]) {
      if (toDateKey(startOfWeek(date)) === weekKey) {
        defaults.add((date.getDay() + 6) % 7);
      }
    }

    setExpandedDays(defaults);
  }, [weekKey]);

  function toggleDay(dayIndex: number) {
    setExpandedDays((current) => {
      const next = new Set(current);

      if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }

      return next;
    });
  }

  const monthWeekKeys = useMemo(() => weeksOfMonth(monthDate).map(toDateKey), [monthDate]);

  const loadMonthItems = useCallback(async () => {
    const supabase = createClient();

    if (!supabase || !activeGroupId) {
      setMonthItems([]);
      return;
    }

    setMonthLoading(true);

    try {
      setMonthItems(await getMealPlanItemsForWeeks(supabase, activeGroupId, monthWeekKeys));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the month.");
    } finally {
      setMonthLoading(false);
    }
  }, [activeGroupId, monthWeekKeys]);

  useEffect(() => {
    if (view === "month") {
      loadMonthItems();
    }
  }, [view, loadMonthItems]);

  async function addDish(entry: FoodEntry, day: number, slot: MealSlot) {
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
          dayOfWeek: day,
          mealSlot: slot,
          createdBy: user?.id ?? null
        });
        setItems((current) => [...current, item]);
        trackEvent("meal_planned", { groupId: activeGroupId, dishId: entry.id, mealSlot: slot, dayOfWeek: day });
      } else {
        setItems((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            groupId: activeGroupId ?? "local",
            foodEntryId: entry.id,
            weekStart: weekKey,
            dayOfWeek: day,
            mealSlot: slot,
            portions: 2,
            isLeftover: false,
            position: current.length
          }
        ]);
      }

      setPicker(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add this dish.");
    } finally {
      busyRef.current = false;
    }
  }

  async function changeItem(
    itemId: string,
    changes: { dayOfWeek?: number; mealSlot?: MealSlot; portions?: number; isLeftover?: boolean }
  ) {
    setError("");
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              dayOfWeek: changes.dayOfWeek ?? item.dayOfWeek,
              mealSlot: changes.mealSlot ?? item.mealSlot,
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

  // ---- copy / paste a whole week ----
  function copyWeek(sourceKey: string, sourceItems: MealPlanItem[], hint?: string) {
    if (!sourceItems.length) {
      return;
    }

    const label = formatWeekRange(fromDateKey(sourceKey));
    setCopyBuffer({ label, sourceKey, items: sourceItems });
    setNotice(`Copied ${label}. ${hint ?? "Open another week and tap Paste here."}`);
  }

  // ---- long press on a month-view week row opens the copy/paste menu ----
  function startWeekPress(event: React.PointerEvent<HTMLDivElement>, weekKey: string, hasItems: boolean) {
    const state = longPressRef.current;
    state.x = event.clientX;
    state.y = event.clientY;
    state.fired = false;

    if (state.timer) {
      window.clearTimeout(state.timer);
    }

    const canPaste = Boolean(copyBuffer && copyBuffer.sourceKey !== weekKey);

    if (!hasItems && !canPaste) {
      return;
    }

    state.timer = window.setTimeout(() => {
      state.fired = true;
      state.timer = null;
      setWeekMenu(weekKey);
    }, 450);
  }

  function moveWeekPress(event: React.PointerEvent<HTMLDivElement>) {
    const state = longPressRef.current;

    if (state.timer && (Math.abs(event.clientX - state.x) > 12 || Math.abs(event.clientY - state.y) > 12)) {
      window.clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function endWeekPress() {
    const state = longPressRef.current;

    if (state.timer) {
      window.clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function suppressClickAfterPress(event: React.MouseEvent<HTMLDivElement>) {
    if (longPressRef.current.fired) {
      event.preventDefault();
      event.stopPropagation();
      longPressRef.current.fired = false;
    }
  }

  async function pasteWeek(targetKey: string) {
    if (!copyBuffer || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setError("");

    try {
      const supabase = createClient();

      if (supabase && activeGroupId) {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        const inserted = await copyMealPlanItems(supabase, copyBuffer.items, targetKey, user?.id ?? null);

        if (targetKey === weekKey) {
          setItems((current) => [...current, ...inserted]);
        }

        if (view === "month") {
          await loadMonthItems();
        }
      } else if (targetKey === weekKey) {
        setItems((current) => [
          ...current,
          ...copyBuffer.items.map((item) => ({ ...item, id: crypto.randomUUID(), weekStart: targetKey }))
        ]);
      }

      setNotice(`Pasted into ${formatWeekRange(fromDateKey(targetKey))}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not paste the week.");
    } finally {
      busyRef.current = false;
    }
  }

  // ---- drag a planned dish between days/slots (start from the grip handle) ----
  function targetFromPoint(x: number, y: number) {
    const slotElement = document.elementFromPoint(x, y)?.closest("[data-slot]") as HTMLElement | null;

    if (!slotElement) {
      return { day: null, slot: null };
    }

    return {
      day: Number(slotElement.dataset.day),
      slot: slotElement.dataset.slot as MealSlot
    };
  }

  function handleDragStart(event: React.PointerEvent<HTMLButtonElement>, item: MealPlanItem) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ item, x: event.clientX, y: event.clientY, overDay: item.dayOfWeek, overSlot: item.mealSlot });
  }

  function handleDragMove(event: React.PointerEvent<HTMLButtonElement>) {
    setDrag((current) => {
      if (!current) return current;

      const target = targetFromPoint(event.clientX, event.clientY);
      return { ...current, x: event.clientX, y: event.clientY, overDay: target.day, overSlot: target.slot };
    });
  }

  function handleDragEnd() {
    setDrag((current) => {
      if (
        current &&
        current.overDay !== null &&
        current.overSlot !== null &&
        (current.overDay !== current.item.dayOfWeek || current.overSlot !== current.item.mealSlot)
      ) {
        changeItem(current.item.id, { dayOfWeek: current.overDay, mealSlot: current.overSlot });
      }

      return null;
    });
  }

  // ---- shopping list: merge ingredient lines across all planned meals ----
  const shoppingList = useMemo(() => {
    const merged = new Map<string, { label: string; count: number }>();
    let mealsCounted = 0;
    let mealsWithoutIngredients = 0;

    for (const item of items) {
      if (item.isLeftover) continue;

      const entry = entriesById.get(item.foodEntryId);
      if (!entry) continue;

      mealsCounted += 1;
      const lines = (entry.ingredients ?? "")
        .split(/\n|,/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        mealsWithoutIngredients += 1;
        continue;
      }

      for (const line of lines) {
        const key = line.toLowerCase();
        const existing = merged.get(key);
        merged.set(key, { label: existing?.label ?? line, count: (existing?.count ?? 0) + 1 });
      }
    }

    return {
      lines: Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label)),
      mealsCounted,
      mealsWithoutIngredients
    };
  }, [items, entriesById]);

  function toggleShoppingList() {
    setShowShoppingList((current) => {
      const next = !current;

      if (next) {
        trackEvent("shopping_list_generated", {
          groupId: activeGroupId ?? undefined,
          mealCount: shoppingList.mealsCounted,
          ingredientCount: shoppingList.lines.length
        });
      }

      return next;
    });
  }

  const showSkeleton = (loading && !items.length) || (entriesStatus !== "error" && !entries.length && entriesStatus !== "ready");

  const pickerEntries = useMemo(() => {
    if (!picker) {
      return { suggested: [] as FoodEntry[], rest: [] as FoodEntry[] };
    }

    const suggested = entries.filter((entry) => entryMatchesSlot(entry, picker.slot));
    const suggestedIds = new Set(suggested.map((entry) => entry.id));

    return { suggested, rest: entries.filter((entry) => !suggestedIds.has(entry.id)) };
  }, [entries, picker]);

  return (
    <main className="relative mx-auto w-full max-w-[760px] px-3 pb-10 pt-1 sm:px-6">
      <header className="flex w-full items-end justify-between gap-4 pb-5 pt-2">
        <h1 className="table-wordmark text-[44px] leading-none text-ink sm:text-[72px]">TABLE</h1>
        <div className="flex items-center pb-1">
          <ProfileButton />
        </div>
      </header>

      <ArchivePageTabs />

      <div className="flex items-end justify-between gap-3">
        <div className="archive-folder-tab">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink">
            {view === "week" ? "Week plan" : "Month plan"}
          </p>
        </div>
        <div className="mb-2 flex shrink-0 items-center rounded-[13px] border border-border bg-[#fbf9f4] p-[3px]">
          <button
            type="button"
            onClick={() => setView("week")}
            className={cn(
              "tap-scale rounded-[9px] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em]",
              view === "week" ? "bg-black text-white" : "text-muted"
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => {
              setMonthDate(weekStart);
              setView("month");
            }}
            className={cn(
              "tap-scale rounded-[9px] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em]",
              view === "month" ? "bg-black text-white" : "text-muted"
            )}
          >
            Month
          </button>
        </div>
      </div>

      <section className="sunday-planner">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <button
          type="button"
          onClick={() =>
            view === "week"
              ? setWeekStart((current) => addDays(current, -7))
              : setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
          }
          className="tap-scale grid size-10 place-items-center rounded-[10px] text-ink"
          aria-label={view === "week" ? "Previous week" : "Previous month"}
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => {
            setWeekStart(startOfWeek(new Date()));
            setMonthDate(new Date());
          }}
          className="tap-scale min-w-0 truncate rounded-[10px] border border-border bg-[#fbf9f4] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink"
          title="Back to today"
          aria-label="Back to today"
        >
          {view === "week"
            ? formatWeekRange(weekStart)
            : monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </button>
        <button
          type="button"
          onClick={() =>
            view === "week"
              ? setWeekStart((current) => addDays(current, 7))
              : setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
          }
          className="tap-scale grid size-10 place-items-center rounded-[10px] text-ink"
          aria-label={view === "week" ? "Next week" : "Next month"}
        >
          <ChevronRight aria-hidden="true" size={20} strokeWidth={2} />
        </button>
      </div>

      {notice ? (
        <p className="mb-4 rounded-lg bg-surface-warm px-4 py-3 text-sm leading-6 text-ink">{notice}</p>
      ) : null}

      {groupStatus === "no-group" ? (
        <p className="rounded-lg border border-border bg-white/72 p-6 text-center text-sm leading-6 text-muted">
          Join or create an archive first — the weekly plan is shared with your archive.
        </p>
      ) : view === "month" ? (
        /* ============================ MONTH VIEW ============================ */
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-7 gap-1 px-1">
            {DAY_LETTERS.map((letter, index) => (
              <p key={index} className="text-center font-mono text-[10px] uppercase text-muted">
                {letter}
              </p>
            ))}
          </div>

          {monthLoading ? (
            <div className="space-y-1">
              {monthWeekKeys.map((key) => (
                <div key={key} className="h-20 animate-pulse rounded-[14px] border border-border bg-white/60" />
              ))}
            </div>
          ) : (
            monthWeekKeys.map((key) => {
              const weekDate = fromDateKey(key);
              const weekItems = monthItems.filter((item) => item.weekStart === key);
              const isViewedWeek = key === weekKey;

              return (
                <div
                  key={key}
                  onPointerDown={(event) => startWeekPress(event, key, weekItems.length > 0)}
                  onPointerMove={moveWeekPress}
                  onPointerUp={endWeekPress}
                  onPointerCancel={endWeekPress}
                  onClickCapture={suppressClickAfterPress}
                  className={cn(
                    "select-none rounded-[12px] border bg-[#fbf9f4] p-1",
                    isViewedWeek ? "border-ink" : "border-border",
                    copyBuffer?.sourceKey === key && "bg-surface-warm"
                  )}
                >
                  <div className="grid grid-cols-7 items-stretch gap-1">
                  {DAY_LABELS.map((_, dayIndex) => {
                    const date = addDays(weekDate, dayIndex);
                    const inMonth = date.getMonth() === monthDate.getMonth();
                    const isToday = toDateKey(date) === todayKey;
                    const dayItems = weekItems
                      .filter((item) => item.dayOfWeek === dayIndex)
                      .sort((a, b) => SLOT_ORDER[a.mealSlot] - SLOT_ORDER[b.mealSlot] || a.position - b.position);

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => {
                          // First tap expands the week's dishes; second tap opens the week.
                          if (expandedMonthWeek !== key) {
                            setExpandedMonthWeek(key);
                            return;
                          }

                          setWeekStart(weekDate);
                          setView("week");
                        }}
                        className={cn(
                          "tap-scale flex min-h-16 flex-col items-center gap-0.5 overflow-hidden rounded-[10px] px-0.5 py-1",
                          inMonth ? "text-ink" : "text-muted/50",
                          isToday && "bg-ink text-white"
                        )}
                      >
                        <span className="font-mono text-[11px]">{date.getDate()}</span>
                        {dayItems.slice(0, 2).map((item) => (
                          <span
                            key={item.id}
                            className={cn(
                              "block w-full truncate text-[9px] leading-[11px]",
                              isToday ? "text-white/85" : "text-muted"
                            )}
                          >
                            {entriesById.get(item.foodEntryId)?.title}
                          </span>
                        ))}
                        {dayItems.length > 2 ? (
                          <span className={cn("text-[9px] leading-[11px]", isToday ? "text-white/85" : "text-muted")}>
                            +{dayItems.length - 2}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  </div>

                  {expandedMonthWeek === key && weekItems.length ? (
                    <div className="mt-1 divide-y divide-border/50 border-t border-border/60 px-2 pt-1">
                      {DAY_LABELS.map((dayLabel, dayIndex) => {
                        const dayItems = weekItems
                          .filter((item) => item.dayOfWeek === dayIndex)
                          .sort((a, b) => SLOT_ORDER[a.mealSlot] - SLOT_ORDER[b.mealSlot] || a.position - b.position);

                        if (!dayItems.length) {
                          return null;
                        }

                        return (
                          <div key={dayIndex} className="flex gap-3 py-2">
                            <span className="w-8 shrink-0 pt-px font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              {dayLabel.slice(0, 3)}
                            </span>
                            <ul className="min-w-0 flex-1 space-y-1">
                              {dayItems.map((item) => (
                                <li key={item.id} className="truncate text-xs leading-5 text-ink">
                                  {entriesById.get(item.foodEntryId)?.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          <p className="pt-1 text-center text-xs leading-5 text-muted">
            Tap a week to see its dishes, tap a day again to open it. Long press a week to copy or paste a plan.
          </p>
        </div>
      ) : showSkeleton ? (
        <div className="mt-4 space-y-3">
          {DAY_LABELS.map((label) => (
            <div key={label} className="h-24 animate-pulse rounded-[18px] border border-border bg-white/60" />
          ))}
        </div>
      ) : (
        /* ============================ WEEK VIEW ============================ */
        <div className="mt-4 space-y-3">
          {DAY_LABELS.map((label, dayIndex) => {
            const date = addDays(weekStart, dayIndex);
            const isToday = toDateKey(date) === todayKey;
            const dayItems = items
              .filter((item) => item.dayOfWeek === dayIndex)
              .sort((a, b) => SLOT_ORDER[a.mealSlot] - SLOT_ORDER[b.mealSlot] || a.position - b.position);

            return (
              <section key={label} data-day={dayIndex} className="rounded-[13px] border border-border bg-[#fbf9f4] p-3">
                <button
                  type="button"
                  onClick={() => toggleDay(dayIndex)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={expandedDays.has(dayIndex)}
                >
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    {label}
                    <span className={cn("ml-2", isToday && "rounded-full bg-ink px-2 py-0.5 text-white")}>
                      {date.getDate()} {date.toLocaleDateString("en-GB", { month: "short" })}
                    </span>
                  </p>
                  {!expandedDays.has(dayIndex) && dayItems.length ? (
                    <span className="font-mono text-xs text-muted">{dayItems.length}</span>
                  ) : null}
                </button>

                {expandedDays.has(dayIndex) ? (
                <div className="mt-3 space-y-2">
                  {MEAL_SLOTS.map((slot) => {
                    const slotItems = dayItems.filter((item) => item.mealSlot === slot.key);
                    const isDropTarget = drag && drag.overDay === dayIndex && drag.overSlot === slot.key;

                    return (
                      <div
                        key={slot.key}
                        data-day={dayIndex}
                        data-slot={slot.key}
                        className={cn(
                          "rounded-[14px] border p-2 transition",
                          isDropTarget ? "border-ink bg-surface-warm" : "border-border/70 bg-surface-warm/45"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 px-1">
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{slot.label}</p>
                          <button
                            type="button"
                            onClick={() => setPicker({ day: dayIndex, slot: slot.key })}
                            className="tap-scale grid size-7 place-items-center rounded-full bg-surface-warm text-ink"
                            aria-label={`Add ${slot.label.toLowerCase()} on ${label}`}
                          >
                            <Plus aria-hidden="true" size={14} strokeWidth={2.1} />
                          </button>
                        </div>

                        {slotItems.length ? (
                          <ul className="mt-1.5 space-y-1.5">
                            {slotItems.map((item) => {
                              const entry = entriesById.get(item.foodEntryId);

                              if (!entry) {
                                return null;
                              }

                              return (
                                <li
                                  key={item.id}
                                  className={cn(
                                    "flex items-center gap-2 rounded-[10px] border border-border bg-[#fbf9f4] p-1.5 pr-2",
                                    drag?.item.id === item.id && "opacity-40"
                                  )}
                                >
                                  <button
                                    type="button"
                                    onPointerDown={(event) => handleDragStart(event, item)}
                                    onPointerMove={handleDragMove}
                                    onPointerUp={handleDragEnd}
                                    onPointerCancel={handleDragEnd}
                                    className="grid size-8 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
                                    aria-label={`Drag ${entry.title} to another day or meal`}
                                  >
                                    <GripVertical aria-hidden="true" size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(item.id)}
                                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                                  >
                                    <img
                                      src={thumbnailSrc(entry.photos[0])}
                                      alt=""
                                      loading="lazy"
                                      className="size-10 shrink-0 rounded-[8px] object-cover"
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
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                ) : null}
              </section>
            );
          })}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => copyWeek(weekKey, items)}
              className="tap-scale flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-surface-warm px-4 text-xs font-semibold text-ink"
            >
              <Copy aria-hidden="true" size={14} />
              Copy this week
            </button>
            {copyBuffer && copyBuffer.sourceKey !== weekKey ? (
              <button
                type="button"
                onClick={() => pasteWeek(weekKey)}
                className="tap-scale flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white"
              >
                <ClipboardPaste aria-hidden="true" size={14} />
                Paste here
              </button>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="mt-4 text-center text-sm leading-6 text-ink">{error}</p> : null}

      {/* ---- weekly shopping list (merged ingredients) ---- */}
      {view === "week" && shoppingList.mealsCounted > 0 ? (
        <section className="mt-6 rounded-[13px] border border-border bg-[#fbf9f4] p-4">
          <button
            type="button"
            onClick={toggleShoppingList}
            className="flex w-full items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted">
              <ShoppingBasket aria-hidden="true" size={16} />
              Shopping list
            </span>
            <span className="font-mono text-xs text-muted">{showShoppingList ? "Hide" : "Show"}</span>
          </button>

          {showShoppingList ? (
            <div className="mt-4 space-y-3">
              {shoppingList.lines.length ? (
                <ul className="space-y-1">
                  {shoppingList.lines.map((line) => (
                    <li key={line.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1 text-base leading-7 text-ink">
                      <span>{line.label}</span>
                      {line.count > 1 ? <span className="font-mono text-xs text-muted">×{line.count}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-muted">
                  No ingredients noted on this week&apos;s dishes yet. Open a card in HOME, tap edit, and add them.
                </p>
              )}
              <p className="text-xs leading-5 text-muted">
                {shoppingList.mealsWithoutIngredients > 0
                  ? `${shoppingList.mealsWithoutIngredients} planned ${shoppingList.mealsWithoutIngredients === 1 ? "meal has" : "meals have"} no ingredients noted. `
                  : ""}
                Leftover meals are skipped — they reuse what you already cooked.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      </section>

      {/* ---- long-press week menu (month view) ---- */}
      {weekMenu ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-ink/55"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setWeekMenu(null);
            }
          }}
        >
          <div className="w-full rounded-t-[28px] bg-[#fffefa] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="pb-4 font-serif text-2xl italic text-ink">{formatWeekRange(fromDateKey(weekMenu))}</p>
            <div className="space-y-2">
              {monthItems.some((item) => item.weekStart === weekMenu) ? (
                <button
                  type="button"
                  onClick={() => {
                    copyWeek(
                      weekMenu,
                      monthItems.filter((item) => item.weekStart === weekMenu),
                      "Long press another week to paste."
                    );
                    setWeekMenu(null);
                  }}
                  className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
                >
                  <Copy aria-hidden="true" size={15} />
                  Copy week
                </button>
              ) : null}
              {copyBuffer && copyBuffer.sourceKey !== weekMenu ? (
                <button
                  type="button"
                  onClick={() => {
                    pasteWeek(weekMenu);
                    setWeekMenu(null);
                  }}
                  className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
                >
                  <ClipboardPaste aria-hidden="true" size={15} />
                  Paste plan ({copyBuffer.label})
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setWeekMenu(null)}
                className="tap-scale flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
      {picker ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-ink/55"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setPicker(null);
            }
          }}
        >
          <div className="max-h-[72dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#fffefa] p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-between pb-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                {MEAL_SLOTS.find((slot) => slot.key === picker.slot)?.label} · {DAY_LABELS[picker.day]}
              </p>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="tap-scale grid size-10 place-items-center text-muted hover:text-ink"
                aria-label="Close picker"
              >
                <X aria-hidden="true" size={22} strokeWidth={1.9} />
              </button>
            </div>

            {entries.length ? (
              <div className="space-y-5">
                {pickerEntries.suggested.length ? (
                  <div>
                    <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                      Tagged “{picker.slot}”
                    </p>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {pickerEntries.suggested.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => addDish(entry, picker.day, picker.slot)}
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
                  </div>
                ) : null}

                {pickerEntries.rest.length ? (
                  <div>
                    {pickerEntries.suggested.length ? (
                      <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Everything else</p>
                    ) : (
                      <p className="pb-2 text-xs leading-5 text-muted">
                        Tip: tag cards “{picker.slot}” in HOME and they&apos;ll appear first here.
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {pickerEntries.rest.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => addDish(entry, picker.day, picker.slot)}
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
                  </div>
                ) : null}
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
                <span className="text-sm font-medium text-ink">Meal</span>
                <div className="flex items-center gap-1">
                  {MEAL_SLOTS.map((slot) => (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => changeItem(editingItem.id, { mealSlot: slot.key })}
                      className={cn(
                        "tap-scale rounded-full px-3 py-1.5 text-xs font-semibold",
                        editingItem.mealSlot === slot.key ? "bg-ink text-white" : "bg-surface-warm text-ink"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

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
