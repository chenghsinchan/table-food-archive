import type { FoodEntry } from "@/types/food";
import { TagPill } from "@/components/ui/TagPill";
import { formatLongDate } from "@/lib/utils/date";
import { entryContributor, entryLocation, entryTypeLabel } from "@/lib/utils/entries";

type EntryDetailProps = {
  entry: FoodEntry;
};

export function EntryDetail({ entry }: EntryDetailProps) {
  const extraPhotos = entry.photos.slice(1);
  const contributor = entryContributor(entry);

  return (
    <div className="table-container py-10">
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1fr]">
        <aside className="space-y-4 text-sm text-muted">
          <div className="rounded-lg bg-white/72 p-5 shadow-sm">
            <dl className="grid gap-4">
              <div>
                <dt className="font-medium text-ink">Type</dt>
                <dd>{entryTypeLabel(entry)}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Where</dt>
                <dd>{entryLocation(entry)}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">When</dt>
                <dd>{formatLongDate(entry.entryDate)}</dd>
              </div>
              {entry.restaurantName ? (
                <div>
                  <dt className="font-medium text-ink">Place</dt>
                  <dd>{entry.restaurantName}</dd>
                </div>
              ) : null}
              {entry.timeMinutes ? (
                <div>
                  <dt className="font-medium text-ink">Time</dt>
                  <dd>{entry.timeMinutes} min</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-ink">Added by</dt>
                <dd className="mt-1 inline-flex items-center gap-2">
                  <span className="grid size-6 overflow-hidden rounded-full bg-ink text-[10px] text-white">
                    {contributor.avatarUrl ? (
                      <img src={contributor.avatarUrl} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center">{contributor.initials}</span>
                    )}
                  </span>
                  {contributor.name}
                </dd>
              </div>
              {entry.wantToRecreate ? (
                <div>
                  <dt className="font-medium text-ink">Marked</dt>
                  <dd>Want to recreate</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>

        <div className="space-y-9">
          {entry.notes ? (
            <section className="space-y-3">
              <p className="text-sm font-medium text-accent">Memory</p>
              <p className="max-w-2xl text-2xl leading-10 text-ink">{entry.notes}</p>
            </section>
          ) : null}

          {entry.recipe ? (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Recipe notes</h2>
              <p className="max-w-2xl whitespace-pre-line text-base leading-8 text-muted">{entry.recipe}</p>
            </section>
          ) : null}

          {extraPhotos.length ? (
            <section className="grid grid-cols-2 gap-3">
              {extraPhotos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.imageUrl}
                  alt={photo.alt}
                  loading="lazy"
                  sizes="(min-width: 1024px) 380px, 50vw"
                  className="aspect-[4/5] rounded-lg object-cover"
                />
              ))}
            </section>
          ) : null}

          <section className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <TagPill key={tag}>{tag}</TagPill>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
