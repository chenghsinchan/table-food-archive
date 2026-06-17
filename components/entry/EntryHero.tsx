import type { FoodEntry } from "@/types/food";
import { formatLongDate } from "@/lib/utils/date";
import { entryLocation, entryTypeLabel } from "@/lib/utils/entries";
import { RatingInput } from "@/components/ui/RatingInput";

type EntryHeroProps = {
  entry: FoodEntry;
};

export function EntryHero({ entry }: EntryHeroProps) {
  const hero = entry.photos[0];

  return (
    <section className="relative -mt-5 overflow-hidden sm:-mt-8">
      <div className="h-[72dvh] min-h-[520px]">
        <img
          src={hero.imageUrl}
          alt={hero.alt}
          fetchPriority="high"
          sizes="100vw"
          className="size-full object-cover"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/76 via-black/30 to-transparent">
        <div className="table-container pb-10 pt-32 text-white">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium text-white/76">{entryLocation(entry)}</p>
            <h1 className="text-5xl font-semibold leading-[0.96] sm:text-7xl">
              {entry.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/78">
              <span>{formatLongDate(entry.entryDate)}</span>
              <span>{entryTypeLabel(entry)}</span>
              {entry.rating ? <RatingInput value={entry.rating} readOnly size="sm" /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
