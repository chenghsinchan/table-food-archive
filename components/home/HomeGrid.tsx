import type { FoodEntry } from "@/types/food";
import { FoodCard } from "@/components/entry/FoodCard";

type HomeGridProps = {
  entries: FoodEntry[];
  onSelect: (entry: FoodEntry) => void;
};

export function HomeGrid({ entries, onSelect }: HomeGridProps) {
  return (
    <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
      {entries.map((entry, index) => (
        <FoodCard
          key={entry.id}
          entry={entry}
          index={index}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
