"use client";

import { useState } from "react";
import type { FoodEntry } from "@/types/food";
import { atmosphereLabel, hasMood, moodFor } from "@/lib/moods";
import { entryLocation, entryTypeLabel } from "@/lib/utils/entries";
import { thumbnailSrc } from "@/lib/utils/photos";

type FoodCardProps = {
  entry: FoodEntry;
  /** Frame number in the archive, newest first (drives "№ 07" on the back). */
  number: number;
  onSelect: (entry: FoodEntry) => void;
};

/**
 * A printed memory: photo on the front, mood-coded index card on the back.
 * Tap anywhere to flip; "See full entry" opens the overlay. 290x430 per the
 * design handoff — sized for an iPhone feed, one receipt at a time.
 */
export function FoodCard({ entry, number, onSelect }: FoodCardProps) {
  const [flipped, setFlipped] = useState(false);
  const mood = moodFor(entry);
  const photo = entry.photos[0];
  const place = shortPlace(entry);

  return (
    <div className="w-full" style={{ perspective: "1400px" }}>
      <div
        className="relative aspect-[29/43] w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform .62s cubic-bezier(.5,.05,.2,1)"
        }}
      >
        {/* ---- front: the photograph ---- */}
        <button
          type="button"
          onClick={() => setFlipped(true)}
          aria-label={`Flip ${entry.title} to its index card`}
          className="absolute inset-0 overflow-hidden rounded-[20px] bg-[#e2ddd2] text-left shadow-[0_10px_22px_-12px_rgba(26,24,23,0.30)] outline-none focus-visible:outline-none"
          style={{
            backfaceVisibility: "hidden",
            opacity: flipped ? 0 : 1,
            transition: "opacity 0s .31s"
          }}
        >
          <img
            src={thumbnailSrc(photo)}
            alt={photo.alt}
            loading="lazy"
            sizes="50vw"
            className="size-full object-cover"
            draggable={false}
          />
          <span className="archive-riso" aria-hidden="true" />
          <span
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(12,10,9,0.62) 0%, rgba(12,10,9,0.1) 42%, transparent 60%)" }}
          />
          {hasMood(entry) ? (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[rgba(12,10,9,0.38)] px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.12em] text-white backdrop-blur-[6px]">
              <span className="size-1.5 rounded-full" style={{ background: mood.bg }} />
              {mood.name}
            </span>
          ) : null}
          <span className="absolute inset-x-3 bottom-3 block text-[#fbf9f4]">
            <span className="block font-serif text-[16px] font-semibold italic leading-[1.1]">{entry.title}</span>
            <span className="mt-1 block truncate font-mono text-[7px] uppercase tracking-[0.12em] opacity-80">
              {shortDate(entry.entryDate)} &middot; {place}
            </span>
          </span>
        </button>

        {/* ---- back: the mood index card ---- */}
        <div
          role="button"
          tabIndex={flipped ? 0 : -1}
          onClick={() => setFlipped(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setFlipped(false);
          }}
          aria-label={`Flip ${entry.title} back to its photo`}
          className="absolute inset-0 flex cursor-pointer flex-col rounded-[20px] p-3.5 shadow-[0_10px_22px_-12px_rgba(26,24,23,0.30)]"
          style={{
            background: mood.bg,
            color: mood.fg,
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            opacity: flipped ? 1 : 0,
            transition: "opacity 0s .31s"
          }}
        >
          <div className="flex items-baseline justify-between font-mono text-[7px] uppercase tracking-[0.14em] opacity-70">
            <span>&#8470; {String(number).padStart(2, "0")} &middot; {mood.name}</span>
            <span className="truncate pl-3">{place}</span>
          </div>

          <p className="mt-2 font-serif text-[17px] font-semibold italic leading-[1.1]">{entry.title}</p>

          {entry.notes ? (
            <p className="mt-1.5 line-clamp-2 font-serif text-[11px] italic leading-[1.4] opacity-90">{entry.notes}</p>
          ) : null}

          <div className="mt-2 font-mono text-[7.5px] uppercase tracking-[0.1em]">
            <CardRow label="Date" value={shortDate(entry.entryDate)} />
            <CardRow label="Weather" value={entry.weather || "—"} />
            <div className="flex items-center justify-between border-t border-current py-1.5">
              <span>Atmosphere</span>
              {entry.atmosphere ? (
                <span className="relative inline-block size-5 rounded-[5px] bg-white/[0.28]" aria-label={atmosphereLabel(entry.atmosphere.x, entry.atmosphere.y)}>
                  <span
                    className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
                    style={{ left: `${entry.atmosphere.x}%`, top: `${entry.atmosphere.y}%` }}
                  />
                </span>
              ) : (
                <span>—</span>
              )}
            </div>
            <CardRow
              label="Made"
              value={entry.dish?.timesMade ? `${entry.dish.timesMade}×` : "1×"}
            />
          </div>

          <span className="flex-1" />

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(entry);
            }}
            className="tap-scale w-full rounded-full border border-current py-1.5 text-center font-mono text-[7.5px] uppercase tracking-[0.14em]"
          >
            See full entry &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-current py-1.5">
      <span>{label}</span>
      <span className="truncate pl-3 normal-case">{value}</span>
    </div>
  );
}

function shortPlace(entry: FoodEntry) {
  if (entry.placeLabel) return entry.placeLabel;
  if (entry.type === "home") return entry.city ? `Home, ${entry.city}` : "At home";
  return entryLocation(entry);
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));
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
