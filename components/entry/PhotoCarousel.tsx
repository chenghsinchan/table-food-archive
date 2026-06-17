"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FoodPhoto } from "@/types/food";

type PhotoCarouselProps = {
  photos: FoodPhoto[];
};

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const hasMany = photos.length > 1;

  function scroll(direction: "left" | "right") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction === "left" ? -scroller.clientWidth : scroller.clientWidth,
      behavior: "smooth"
    });
  }

  return (
    <section className="relative bg-ink">
      <div
        ref={scrollerRef}
        className="flex max-h-[54dvh] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={hasMany ? "Food photos" : undefined}
      >
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={photo.imageUrl}
            alt={photo.alt}
            loading="lazy"
            sizes="(min-width: 768px) 760px, 100vw"
            className="max-h-[54dvh] min-w-full snap-center object-cover"
            draggable={false}
          />
        ))}
      </div>

      {hasMany ? (
        <>
          <button
            type="button"
            onClick={() => scroll("left")}
            className="tap-scale absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/48 text-white"
            aria-label="Previous photo"
          >
            <ChevronLeft aria-hidden="true" size={21} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="tap-scale absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/48 text-white"
            aria-label="Next photo"
          >
            <ChevronRight aria-hidden="true" size={21} strokeWidth={2} />
          </button>
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((photo) => (
              <span key={`${photo.id}-dot`} className="size-1.5 rounded-full bg-white/76 shadow-sm" />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
