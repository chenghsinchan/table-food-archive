import type { FoodEntry } from "@/types/food";
import { FoodCard } from "@/components/entry/FoodCard";

type HomeGridProps = {
  entries: FoodEntry[];
  priority?: boolean;
  onSelect: (entry: FoodEntry) => void;
};

export function HomeGrid({ entries, priority, onSelect }: HomeGridProps) {
  return (
    <div className="columns-2 gap-1.5 md:columns-3 lg:columns-4">
      {entries.map((entry, index) => (
        <FoodCard
          key={entry.id}
          entry={entry}
          index={index}
          priority={priority && index < 4}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
