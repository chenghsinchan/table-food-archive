import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ClothingCategory } from "@/types";
import { store } from "@/lib/storage";
import { Button, Empty, MonoLabel, Section } from "@/components/ui";

const FILTERS: ("All" | ClothingCategory)[] = [
  "All",
  "Tops",
  "Bottoms",
  "Outerwear",
  "Shoes",
  "Accessories",
];

export default function Wardrobe() {
  const items = useMemo(() => store.getItems(), []);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const shown = filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="space-y-6">
      <Section title="Wardrobe" index="03 / Wardrobe">
        <p className="text-sm text-ink-soft">
          Everything you own, recorded once and read against your body. Tap an
          item to record how it makes you feel.
        </p>
      </Section>

      <div className="no-scrollbar relative z-[1] -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 text-xs uppercase tracking-wider ${
              filter === f ? "bg-ink text-paper" : "frame text-ink-soft"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty>nothing here yet — add your first garment</Empty>
      ) : (
        <div className="relative z-[1] grid grid-cols-2 gap-3">
          {shown.map((it) => (
            <Link
              key={it.id}
              to={`/item/${it.id}`}
              className="frame group block overflow-hidden bg-paper-dim"
            >
              <div className="relative aspect-[4/5]">
                {it.photo ? (
                  <img
                    src={it.photo}
                    alt={it.name}
                    className="h-full w-full object-cover grayscale-[10%]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="mono-label">{it.category}</span>
                  </div>
                )}
                {it.frequencyWorn > 0 && (
                  <span className="absolute right-1.5 top-1.5 tape">
                    ×{it.frequencyWorn}
                  </span>
                )}
              </div>
              <div className="border-t border-ink px-2 py-1.5">
                <p className="truncate text-xs font-bold">{it.name}</p>
                <div className="flex items-center justify-between">
                  <MonoLabel>{it.colour}</MonoLabel>
                  <span className="mono-label text-mark">{it.category}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="relative z-[1]">
        <Link to="/add">
          <Button>+ Add item</Button>
        </Link>
      </div>
    </div>
  );
}
