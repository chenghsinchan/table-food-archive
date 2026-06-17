import type { FoodEntry } from "@/types/food";
import { RatingInput } from "@/components/ui/RatingInput";
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
  const type = foodCardType(entry);
  const tags = foodCardTags(entry);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="group mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-lg bg-ink text-left outline-none focus:outline-none focus-visible:outline-none"
    >
      <article className="relative">
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
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/76 via-black/24 to-transparent p-3 text-white">
          <div className="space-y-1.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/78">{type}</p>
            <RatingInput value={entry.rating ?? 0} readOnly size="sm" tone="light" />
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight">{entry.title}</h3>
            {tags.length ? (
              <p className="truncate text-[12px] leading-5 text-white/82">{tags.join(" · ")}</p>
            ) : null}
          </div>
        </div>
      </article>
    </button>
  );
}

export function foodCardType(entry: FoodEntry) {
  if ((entry.type === "restaurant" || entry.type === "travel") && entry.wantToRecreate) {
    return "RECREATE";
  }

  return entryTypeLabel(entry).toUpperCase();
}

export function foodCardTags(entry: FoodEntry) {
  const tags = [...entry.tags];

  if (entry.wantToRecreate && !tags.some((tag) => tag.toLowerCase() === "want to recreate")) {
    tags.push("Want to recreate");
  }

  return tags.slice(0, 4);
}
