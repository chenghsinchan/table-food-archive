import Link from "next/link";
import type { FoodEntry } from "@/types/food";
import { foodCardTags, foodCardType } from "@/components/entry/FoodCard";
import { formatShortDate } from "@/lib/utils/date";
import { thumbnailSrc } from "@/lib/utils/photos";

type TonightSuggestionsProps = {
  entries: FoodEntry[];
};

export function TonightSuggestions({ entries }: TonightSuggestionsProps) {
  if (!entries.length) {
    return (
      <div className="rounded-[18px] border border-border bg-white/72 p-8 text-center font-mono text-sm text-muted">
        No matches for this mood yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <TonightCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function TonightCard({ entry }: { entry: FoodEntry }) {
  const photo = entry.photos[0];
  const tags = foodCardTags(entry);

  return (
    <Link
      href={`/entry/${entry.id}`}
      className="tap-scale block overflow-hidden rounded-[18px] border border-border bg-white shadow-sm"
    >
      <img
        src={thumbnailSrc(photo)}
        alt={photo.alt}
        loading="lazy"
        sizes="(min-width: 640px) 640px, 100vw"
        className="h-56 w-full object-cover sm:h-72"
      />
      <article className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="truncate font-mono text-xs uppercase tracking-[0.18em] text-muted">{foodCardType(entry)}</p>
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-[32px] italic leading-tight text-ink">{entry.title}</h2>
          {entry.recipe || entry.notes ? (
            <p className="line-clamp-3 text-base leading-7 text-muted">
              {entry.recipe ?? entry.notes}
            </p>
          ) : null}
          {tags.length ? <p className="line-clamp-1 text-sm leading-6 text-muted">{tags.join(" · ")}</p> : null}
        </div>
        <p className="border-t border-border pt-4 font-mono text-xs uppercase tracking-[0.16em] text-muted">
          Last eaten {formatShortDate(entry.entryDate)}
        </p>
      </article>
    </Link>
  );
}
