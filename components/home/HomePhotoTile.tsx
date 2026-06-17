import type { FoodEntry } from "@/types/food";
import { FoodCard } from "@/components/entry/FoodCard";

type HomePhotoTileProps = {
  entry: FoodEntry;
  index: number;
  onSelect: (entry: FoodEntry) => void;
};

export function HomePhotoTile({ entry, index, onSelect }: HomePhotoTileProps) {
  return <FoodCard entry={entry} index={index} onSelect={onSelect} />;
}
