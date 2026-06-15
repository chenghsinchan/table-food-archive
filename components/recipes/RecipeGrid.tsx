"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { FoodEntry } from "@/types/food";
import { RatingInput } from "@/components/ui/RatingInput";
import { cn } from "@/lib/utils/cn";
import { entryLocation, entryTypeLabel } from "@/lib/utils/entries";

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
        "group relative h-[66dvh] max-h-[600px] min-h-[430px] w-[78vw] max-w-[390px] shrink-0 snap-center overflow-hidden rounded-[26px] bg-ink text-left shadow-[0_28px_72px_rgba(17,17,17,0.16)] outline-none transition-[transform,opacity,filter] duration-500 ease-out focus:outline-none focus-visible:outline-none sm:w-[380px]",
        index > 0 && "-ml-[22vw] sm:-ml-[150px]",
        isActive ? "opacity-100" : "opacity-70 saturate-[0.82]",
        Math.abs(offset) > 3 && "opacity-35"
      )}
      style={{
        transform: cardTransform(offset),
        zIndex: 60 - distance
      }}
    >
      <img
        src={photo.imageUrl}
        alt={photo.alt}
        loading="lazy"
        className="size-full object-cover transition duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/18 to-transparent" />
      {entry.wantToRecreate ? (
        <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-[0_8px_26px_rgba(0,0,0,0.16)]">
          <Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />
        </span>
      ) : null}
      <article className="absolute inset-x-0 bottom-0 space-y-4 p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-mono text-xs uppercase tracking-[0.18em] text-white/74">{place}</p>
          {entry.rating ? <RatingInput value={entry.rating} readOnly size="sm" /> : null}
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-[34px] italic leading-none">{entry.title}</h2>
          <p className="line-clamp-2 text-sm leading-6 text-white/78">
            {entry.recipe ?? entry.notes ?? "Tap to open recipe notes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {entry.tags.filter((tag) => tag !== "Home").slice(0, 3).map((tag) => (
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
    <section className="relative -mx-4 overflow-hidden bg-background py-3 sm:mx-0">
      <div
        ref={scrollerRef}
        onScroll={updateActiveFromScroll}
        className="flex snap-x snap-mandatory overflow-x-auto px-[calc(50vw_-_39vw)] pb-8 pt-3 [perspective:1100px] [scroll-behavior:smooth] [scrollbar-width:none] sm:px-[calc(50%_-_190px)] [&::-webkit-scrollbar]:hidden"
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
