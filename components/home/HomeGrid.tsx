import type { FoodEntry } from "@/types/food";
import { FoodCard } from "@/components/entry/FoodCard";
import { groupEntriesByMonth } from "@/lib/utils/entries";

type HomeGridProps = {
  entries: FoodEntry[];
  onSelect: (entry: FoodEntry) => void;
};

/**
 * The archive feed: one printed memory at a time, filed under month tabs.
 * Frame numbers run across the whole archive, newest first.
 */
export function HomeGrid({ entries, onSelect }: HomeGridProps) {
  const months = groupEntriesByMonth(entries);
  let frame = 0;

  return (
    <div className="space-y-12">
      {months.map((group, groupIndex) => {
        const places = Array.from(new Set(group.entries.map(placeName).filter(Boolean))).slice(0, 4);
        const startFrame = frame;
        frame += group.entries.length;

        return (
          <section key={group.month} aria-labelledby={`month-${groupIndex}`}>
            {/* First folder tab shares its row with the frame count, mirroring
                SUNDAY's tab row so both pages' folders start at the same height. */}
            <div className="flex items-end justify-between gap-3">
              <header className="archive-folder-tab">
                <h2 id={`month-${groupIndex}`} className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink">
                  {group.month}
                </h2>
              </header>
              {groupIndex === 0 ? (
                <span className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                  {String(entries.length).padStart(2, "0")} frames
                </span>
              ) : null}
            </div>
            <div className="archive-folder">
              {places.length ? (
                <p className="mb-4 px-1 text-center font-mono text-[8px] uppercase tracking-[0.15em] text-muted">
                  {places.join(" · ")}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                {group.entries.map((entry, index) => (
                  <FoodCard
                    key={entry.id}
                    entry={entry}
                    number={startFrame + index + 1}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function placeName(entry: FoodEntry) {
  if (entry.placeLabel) return entry.placeLabel;
  if (entry.type === "home") return entry.city ? `Home, ${entry.city}` : "At home";
  return entry.city || entry.country || entry.restaurantName || "";
}
