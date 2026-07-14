import type { FoodEntry } from "@/types/food";
import { cn } from "@/lib/utils/cn";
import { entryTypeLabel } from "@/lib/utils/entries";
import { thumbnailSrc } from "@/lib/utils/photos";

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
  onSelect: (entry: FoodEntry) => void;
};

export function FoodCard({ entry, index, onSelect }: FoodCardProps) {
  const photo = entry.photos[0];

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="group mb-3 block w-full break-inside-avoid text-left outline-none focus:outline-none focus-visible:outline-none"
    >
      <article className="card-deckle relative overflow-hidden rounded-[14px]">
        <img
          src={thumbnailSrc(photo)}
          alt={photo.alt}
          loading="lazy"
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className={cn(
            "w-full object-cover",
            aspectByIndex[index % aspectByIndex.length]
          )}
        />
        <span className="riso-grain" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/68 via-black/18 to-transparent p-3 text-white">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight">{entry.title}</h3>
          </div>
        </div>
      </article>
    </button>
  );
}

export function foodCardType(entry: FoodEntry) {
  return entryTypeLabel(entry).toUpperCase();
}

export function foodCardTags(entry: FoodEntry) {
  const tags = [...entry.tags];

  if (entry.wantToRecreate && !tags.some((tag) => tag.toLowerCase() === "want to recreate")) {
    tags.push("Want to recreate");
  }

  return tags.slice(0, 4);
}
