import Link from "next/link";
import type { FoodEntry } from "@/types/food";
import { foodCardTags, foodCardType } from "@/components/entry/FoodCard";
import { formatShortDate } from "@/lib/utils/date";
import { RatingInput } from "@/components/ui/RatingInput";
import { thumbnailSrc } from "@/lib/utils/photos";

type RecommendationCardProps = {
  entry: FoodEntry;
};

export function RecommendationCard({ entry }: RecommendationCardProps) {
  const photo = entry.photos[0];
  const tags = foodCardTags(entry);

  return (
    <Link
      href={`/entry/${entry.id}`}
      className="tap-scale grid overflow-hidden rounded-lg bg-white shadow-sm sm:grid-cols-[0.96fr_1fr]"
    >
      <img
        src={thumbnailSrc(photo)}
        alt={photo.alt}
        loading="lazy"
        sizes="(min-width: 640px) 50vw, 100vw"
        className="h-72 w-full object-cover sm:h-full"
      />
      <article className="flex min-h-72 flex-col justify-between p-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-medium uppercase text-muted">
              {foodCardType(entry)}
            </p>
            <RatingInput value={entry.rating ?? 0} readOnly size="sm" />
          </div>
          <h2 className="text-3xl font-semibold leading-tight text-ink">{entry.title}</h2>
          {tags.length ? <p className="line-clamp-1 text-sm leading-6 text-muted">{tags.join(" · ")}</p> : null}
          {entry.notes ? <p className="line-clamp-3 text-base leading-7 text-muted">{entry.notes}</p> : null}
        </div>
        <p className="pt-5 text-sm font-medium text-muted">Last eaten {formatShortDate(entry.entryDate)}</p>
      </article>
    </Link>
  );
}
