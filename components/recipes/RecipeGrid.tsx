"use client";

import { useEffect, useRef, useState } from "react";
import type { FoodEntry } from "@/types/food";
import { RatingInput } from "@/components/ui/RatingInput";
import { cn } from "@/lib/utils/cn";
import { entryLocation, entryTypeLabel } from "@/lib/utils/entries";
import { thumbnailSrc } from "@/lib/utils/photos";

type RecipeGridProps = {
  entries: FoodEntry[];
  onSelect: (entry: FoodEntry) => void;
};

function cardTransform(offset: number) {
  const distance = Math.min(Math.abs(offset), 3);
  const direction = offset < 0 ? -1 : 1;

  if (offset === 0) {
    return "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) scale(1)";
  }

  return `translate3d(${direction * distance * 10}px, ${distance * 8}px, 0) rotateY(${direction * -18}deg) rotateZ(${direction * 4}deg) scale(${1 - distance * 0.075})`;
}

function RecipeCover({
  entry,
  index,
  activeIndex,
  setCardRef,
  onSelect
}: {
  entry: FoodEntry;
  index: number;
  activeIndex: number;
  setCardRef: (index: number, node: HTMLButtonElement | null) => void;
  onSelect: (entry: FoodEntry) => void;
}) {
  const photo = entry.photos[0];
  const place = entry.restaurantName ? entryLocation(entry) : entryTypeLabel(entry);
  const offset = index - activeIndex;
  const distance = Math.min(Math.abs(offset), 4);
  const isActive = offset === 0;

  return (
    <button
      ref={(node) => setCardRef(index, node)}
      type="button"
      onClick={() => onSelect(entry)}
      className={cn(
        "group relative h-[clamp(350px,58dvh,560px)] max-h-[calc(100dvh-230px)] w-[78vw] max-w-[390px] shrink-0 snap-center overflow-hidden rounded-[26px] bg-ink text-left shadow-sm outline-none transition-[transform,opacity] duration-200 ease-out focus:outline-none focus-visible:outline-none sm:w-[380px]",
        index > 0 && "-ml-[22vw] sm:-ml-[150px]",
        isActive ? "opacity-100" : "opacity-70",
        Math.abs(offset) > 3 && "opacity-35"
      )}
      style={{
        transform: cardTransform(offset),
        zIndex: 60 - distance
      }}
    >
      <img
        src={thumbnailSrc(photo)}
        alt={photo.alt}
        loading="lazy"
        sizes="min(78vw, 390px)"
        className="size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/18 to-transparent" />
      <article className="absolute inset-x-0 bottom-0 min-h-[210px] space-y-4 p-5 text-white">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <p className="truncate font-mono text-xs uppercase tracking-[0.18em] text-white/74">{place}</p>
          {entry.rating ? <RatingInput value={entry.rating} readOnly size="sm" /> : null}
        </div>
        <div className="space-y-2">
          <h2 className="line-clamp-2 font-serif text-[34px] italic leading-none">{entry.title}</h2>
          <p className="line-clamp-2 text-sm leading-6 text-white/78">
            {entry.recipe ?? entry.notes ?? "Tap to open recipe notes."}
          </p>
        </div>
        <div className="flex min-h-[30px] flex-wrap gap-2">
          {entry.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/22 bg-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/86"
            >
              {tag === "Favorites" ? "Favorite" : tag}
            </span>
          ))}
        </div>
      </article>
    </button>
  );
}

export function RecipeGrid({ entries, onSelect }: RecipeGridProps) {
  const startIndex = Math.max(0, Math.floor(entries.length / 2));
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setActiveIndex(Math.max(0, Math.floor(entries.length / 2)));
  }, [entries.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeCard = cardRefs.current[activeIndex];

    if (!scroller || !activeCard) return;

    const left = activeCard.offsetLeft - (scroller.clientWidth - activeCard.clientWidth) / 2;
    scroller.scrollTo({ left, behavior: "smooth" });
  }, [activeIndex, entries.length]);

  function updateActiveFromScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let closestIndex = activeIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - center);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  }

  return (
    <section className="relative -mx-4 min-h-0 flex-1 overflow-hidden sm:mx-0">
      <div
        ref={scrollerRef}
        onScroll={updateActiveFromScroll}
        className="flex h-full snap-x snap-mandatory items-center overflow-x-auto px-[calc(50vw_-_39vw)] pb-28 pt-1 [perspective:900px] [scrollbar-width:none] sm:px-[calc(50%_-_190px)] [&::-webkit-scrollbar]:hidden"
      >
        {entries.map((entry, index) => (
          <RecipeCover
            key={entry.id}
            entry={entry}
            index={index}
            activeIndex={activeIndex}
            setCardRef={(cardIndex, node) => {
              cardRefs.current[cardIndex] = node;
            }}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
