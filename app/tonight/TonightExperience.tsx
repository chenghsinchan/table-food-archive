"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, RotateCcw, X } from "lucide-react";
import type { FoodEntry } from "@/types/food";
import { foodCardTags, foodCardType } from "@/components/entry/FoodCard";
import { FoodEntryModal } from "@/components/entry/FoodEntryModal";
import { ProfileButton } from "@/components/profile/ProfileButton";
import { DeckSkeleton } from "@/components/ui/EntrySkeletons";
import { useFoodEntries } from "@/lib/entries/EntryCacheProvider";
import { createClient } from "@/lib/supabase/client";
import { setEntryLovedInSupabase } from "@/lib/supabase/save-entry";
import { cn } from "@/lib/utils/cn";
import { thumbnailSrc } from "@/lib/utils/photos";

type DragState = {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
};

function shuffleEntries(entries: FoodEntry[], seed: number) {
  const shuffled = [...entries];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = (seed * 31 + index * 17 + shuffled[index].id.length) % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function DeckCard({
  entry,
  index,
  drag,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: {
  entry: FoodEntry;
  index: number;
  drag: DragState | null;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const photo = entry.photos[0];
  const type = foodCardType(entry);
  const tags = foodCardTags(entry);
  const isTop = index === 0;
  const dragX = isTop ? drag?.x ?? 0 : 0;
  const dragY = isTop ? drag?.y ?? 0 : 0;
  const rotation = isTop ? dragX / 18 : index % 2 === 0 ? -4 : 4;
  const scale = isTop ? 1 : 1 - index * 0.045;
  const translateY = isTop ? 0 : index * 13;

  return (
    <div
      onPointerDown={isTop ? onPointerDown : undefined}
      onPointerMove={isTop ? onPointerMove : undefined}
      onPointerUp={isTop ? onPointerUp : undefined}
      onPointerCancel={isTop ? onPointerUp : undefined}
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[30px] bg-ink text-left shadow-sm transition-opacity duration-150",
        isTop ? "cursor-grab touch-none active:cursor-grabbing" : "pointer-events-none opacity-60",
        !isTop && "pattern-riso"
      )}
      style={{
        zIndex: 30 - index,
        transform: `translate3d(${dragX}px, ${translateY + dragY}px, 0) rotate(${rotation}deg) scale(${scale})`
      }}
    >
      <img
        src={thumbnailSrc(photo)}
        alt={photo.alt}
        loading="lazy"
        sizes="min(100vw, 390px)"
        className="size-full object-cover"
        draggable={false}
      />
      {!isTop ? <div className="absolute inset-0 bg-white/42" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/16 to-transparent" />
      {entry.isLoved ? (
        <div className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/86 text-ink">
          <Heart aria-hidden="true" size={18} fill="currentColor" strokeWidth={1.8} />
        </div>
      ) : null}
      <article className="absolute inset-x-0 bottom-0 space-y-3 p-5 text-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/72">{type}</p>
        <h1 className="font-serif text-[38px] italic leading-none">{entry.title}</h1>
        <div className="pattern-divider opacity-80" />
        {entry.notes ? <p className="line-clamp-2 text-sm leading-6 text-white/84">{entry.notes}</p> : null}
        {tags.length ? <p className="line-clamp-2 text-sm leading-6 text-white/84">{tags.join(" · ")}</p> : null}
      </article>
    </div>
  );
}

export function TonightExperience() {
  const [seed, setSeed] = useState(7);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const [loveError, setLoveError] = useState("");
  const { entries, status, upsertEntry, removeEntry } = useFoodEntries();
  const availableEntries = useMemo(() => entries, [entries]);
  const deck = useMemo(() => shuffleEntries(availableEntries, seed), [availableEntries, seed]);
  const visibleCards = deck.slice(index, index + 4);
  const showSkeleton = !entries.length && status !== "error";

  useEffect(() => {
    setIndex(0);
  }, [seed, availableEntries.length]);

  useEffect(() => {
    if (deck.length && index >= deck.length) {
      setIndex(0);
    }
  }, [deck.length, index]);

  function updateEntry(nextEntry: FoodEntry) {
    upsertEntry(nextEntry);
    setSelectedEntry(nextEntry);
  }

  function deleteEntry(entryId: string) {
    removeEntry(entryId);
    setSelectedEntry(null);
  }

  function resetDeck() {
    setSeed((value) => value + 1);
    setIndex(0);
    setDrag(null);
  }

  function advanceCard() {
    setIndex((value) => {
      const next = value + 1;
      return next >= deck.length ? 0 : next;
    });
  }

  function moveCard(direction: "left" | "right") {
    if (direction === "right") {
      loveCurrentCard();
    } else {
      setDrag(null);
      advanceCard();
    }
  }

  async function loveCurrentCard() {
    const current = deck[index];

    setDrag(null);
    setLoveError("");

    if (!current) {
      return;
    }

    if (current.isLoved) {
      advanceCard();
      return;
    }

    try {
      const supabase = createClient();

      if (supabase) {
        await setEntryLovedInSupabase(supabase, current.id, true);
      }

      upsertEntry({ ...current, isLoved: true });
      advanceCard();
    } catch (caught) {
      setLoveError(caught instanceof Error ? caught.message : "Could not save this to LOVE.");
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    setDrag((current) => {
      if (!current || current.id !== event.pointerId) return current;

      return {
        ...current,
        x: event.clientX - current.startX,
        y: event.clientY - current.startY
      };
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || drag.id !== event.pointerId) return;

    if (drag.x > 92) {
      moveCard("right");
      return;
    }

    if (drag.x < -92) {
      moveCard("left");
      return;
    }

    setDrag(null);
  }

  if (showSkeleton) {
    return (
      <main className="relative mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-[1180px] flex-col items-center px-4 pb-6 pt-1 sm:px-6 lg:px-8">
        <header className="flex w-full items-end justify-between gap-4 pb-5 pt-2">
          <h1 className="table-wordmark text-[58px] leading-none text-ink sm:text-[86px]">
            TABLE
          </h1>
          <div className="flex items-center pb-1">
            <ProfileButton />
          </div>
        </header>
        <DeckSkeleton />
      </main>
    );
  }

  if (!deck.length) {
    return (
      <div className="mx-auto grid min-h-[70dvh] w-full max-w-[460px] place-items-center px-5">
        <div className="pattern-hatch grid size-40 place-items-center rounded-[32px] border border-border bg-white/72">
          <RotateCcw aria-hidden="true" size={34} strokeWidth={1.8} className="text-muted" />
        </div>
      </div>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-[1180px] flex-col items-center px-4 pb-6 pt-1 sm:px-6 lg:px-8">
      <header className="flex w-full items-end justify-between gap-4 pb-5 pt-2">
        <h1 className="table-wordmark text-[58px] leading-none text-ink sm:text-[86px]">
          TABLE
        </h1>
        <div className="flex items-center pb-1">
          <ProfileButton />
        </div>
      </header>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
        <div className="relative h-[64dvh] min-h-[440px] w-full max-w-[390px]">
        {visibleCards.map((entry, cardIndex) => (
          <DeckCard
            key={`${entry.id}-${index + cardIndex}`}
            entry={entry}
            index={cardIndex}
            drag={drag}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        )).reverse()}
      </div>

      <div className="relative z-20 flex w-full max-w-[260px] items-center justify-between text-ink">
        <button
          type="button"
          onClick={() => moveCard("left")}
          className="tap-scale grid size-10 place-items-center"
          aria-label="No"
        >
          <X aria-hidden="true" size={21} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={resetDeck}
          className="tap-scale grid size-10 place-items-center text-muted hover:text-ink"
          aria-label="Shuffle"
        >
          <RotateCcw aria-hidden="true" size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={loveCurrentCard}
          className="tap-scale grid size-10 place-items-center"
          aria-label={deck[index]?.isLoved ? "Already in Love" : "Save to Love"}
        >
          <Heart aria-hidden="true" size={20} fill={deck[index]?.isLoved ? "currentColor" : "none"} strokeWidth={2.2} />
        </button>
      </div>
        {loveError ? <p className="mt-3 max-w-sm text-center text-sm leading-6 text-ink">{loveError}</p> : null}
      </div>

      {selectedEntry ? (
        <FoodEntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
        />
      ) : null}
    </main>
  );
}
