import type { FoodEntry } from "@/types/food";
import { FoodCard } from "@/components/entry/FoodCard";

type HomePhotoTileProps = {
  entry: FoodEntry;
  index: number;
  priority?: boolean;
  onSelect: (entry: FoodEntry) => void;
};

export function HomePhotoTile({ entry, index, priority, onSelect }: HomePhotoTileProps) {
  return <FoodCard entry={entry} index={index} priority={priority} onSelect={onSelect} />;
}
