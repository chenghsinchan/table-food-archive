import type { FoodEntry } from "@/types/food";
import { cn } from "@/lib/utils/cn";
import { entryLocation, entryTypeLabel } from "@/lib/utils/entries";

const aspectByIndex = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[5/6]",
  "aspect-[4/3]"
];

type FoodCardProps = {
  entry: FoodEntry;
  index: number;
  priority?: boolean;
  onSelect: (entry: FoodEntry) => void;
};

export function FoodCard({ entry, index, priority, onSelect }: FoodCardProps) {
  const photo = entry.photos[0];
  const place = entry.restaurantName ? entryLocation(entry) : entryTypeLabel(entry);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="group mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-lg bg-ink text-left shadow-[0_16px_40px_rgba(17,17,17,0.12)] outline-none focus:outline-none focus-visible:outline-none"
    >
      <article className="relative">
        <img
          src={photo.imageUrl}
          alt={photo.alt}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "w-full object-cover transition duration-700 group-hover:scale-[1.025]",
            aspectByIndex[index % aspectByIndex.length]
          )}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/76 via-black/24 to-transparent p-3 text-white">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight">{entry.title}</h3>
            <p className="truncate text-[12px] leading-5 text-white/78">{place}</p>
          </div>
        </div>
      </article>
    </button>
  );
}
