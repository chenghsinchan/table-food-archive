import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ClothingItem, OutfitLog } from "@/types";
import { store } from "@/lib/storage";
import { Empty, MonoLabel, Section } from "@/components/ui";

export default function Archive() {
  const logs = useMemo(() => store.getLogs(), []);
  const items = useMemo(() => store.getItems(), []);

  const byMonth = useMemo(() => groupByMonth(logs), [logs]);
  const insights = useMemo(() => buildInsights(items), [items]);

  return (
    <div className="space-y-8">
      <Section title="Archive" index="06 / Archive">
        <p className="text-sm text-ink-soft">
          What you've learned about your second skin, over time.
        </p>
      </Section>

      {/* insight cards */}
      <div className="relative z-[1] space-y-3">
        <InsightCard
          title="Most worn"
          items={insights.mostWorn}
          render={(i) => `×${i.frequencyWorn}`}
          accent="text-mark"
        />
        <InsightCard
          title="Felt most confident"
          items={insights.mostConfident}
          render={(i) => `cnf ${i.feeling.confidence}`}
          accent="text-annotate"
        />
        <InsightCard
          title="Felt most comfortable"
          items={insights.mostComfortable}
          render={(i) => `cmf ${i.feeling.comfort}`}
          accent="text-violet"
        />
        <div className="frame bg-paper/40 p-3">
          <MonoLabel>Materials you reach for</MonoLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {insights.materials.length ? (
              insights.materials.map(([m, n]) => (
                <span key={m} className="tape">
                  {m} ×{n}
                </span>
              ))
            ) : (
              <span className="mono-label">—</span>
            )}
          </div>
        </div>
      </div>

      {/* timeline */}
      <section className="relative z-[1]">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="mono-label text-mark">timeline</span>
          <h2 className="display text-xl">By month</h2>
        </div>
        {byMonth.length === 0 ? (
          <Empty>no logs to chart yet</Empty>
        ) : (
          <div className="space-y-6">
            {byMonth.map(([month, monthLogs]) => (
              <div key={month}>
                <div className="mb-2 flex items-center gap-3">
                  <span className="font-mono text-xs">{month}</span>
                  <span className="h-px flex-1 bg-ink/20" />
                  <span className="mono-label">{monthLogs.length} days</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {monthLogs.map((log) => (
                    <Link
                      key={log.id}
                      to="/journal"
                      className="frame aspect-square overflow-hidden bg-paper-dim"
                    >
                      {log.photo ? (
                        <img src={log.photo} alt="" className="h-full w-full object-cover grayscale-[20%]" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-1 text-center">
                          <span className="mono-label text-[0.5rem]">{log.mood}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InsightCard({
  title,
  items,
  render,
  accent,
}: {
  title: string;
  items: ClothingItem[];
  render: (i: ClothingItem) => string;
  accent: string;
}) {
  return (
    <div className="frame bg-paper/40 p-3">
      <MonoLabel>{title}</MonoLabel>
      {items.length ? (
        <ul className="mt-2 space-y-1">
          {items.map((i) => (
            <li key={i.id} className="flex items-baseline justify-between">
              <Link to={`/item/${i.id}`} className="truncate text-sm font-bold underline-offset-2 hover:underline">
                {i.name}
              </Link>
              <span className={`font-mono text-xs ${accent}`}>{render(i)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 mono-label">—</p>
      )}
    </div>
  );
}

function groupByMonth(logs: OutfitLog[]): [string, OutfitLog[]][] {
  const map = new Map<string, OutfitLog[]>();
  for (const log of [...logs].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = monthLabel(log.date);
    (map.get(key) ?? map.set(key, []).get(key)!).push(log);
  }
  return [...map.entries()];
}

function monthLabel(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Undated";
  return d.toLocaleString("en", { month: "long", year: "numeric" });
}

function buildInsights(items: ClothingItem[]) {
  const top = (sel: (i: ClothingItem) => number) =>
    [...items].sort((a, b) => sel(b) - sel(a)).slice(0, 3).filter(sel);

  const materials = new Map<string, number>();
  for (const i of items) {
    if (!i.material) continue;
    materials.set(i.material, (materials.get(i.material) ?? 0) + 1);
  }

  return {
    mostWorn: top((i) => i.frequencyWorn),
    mostConfident: top((i) => i.feeling.confidence),
    mostComfortable: top((i) => i.feeling.comfort),
    materials: [...materials.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
  };
}
