export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="columns-2 gap-1.5 md:columns-3 lg:columns-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={[
            "mb-1.5 break-inside-avoid rounded-lg bg-white/76",
            index % 5 === 0 ? "h-56" : index % 3 === 0 ? "h-44" : "h-64"
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function CoverSkeleton() {
  return (
    <section className="relative -mx-4 min-h-0 flex-1 overflow-hidden sm:mx-0" aria-hidden="true">
      <div className="flex h-full items-center overflow-hidden px-[calc(50vw_-_39vw)] pb-28 pt-1 sm:px-[calc(50%_-_190px)]">
        <div className="h-[clamp(350px,58dvh,560px)] max-h-[calc(100dvh-230px)] w-[78vw] max-w-[390px] shrink-0 rounded-[26px] bg-white/76 sm:w-[380px]" />
      </div>
    </section>
  );
}

export function DeckSkeleton() {
  return (
    <div className="relative h-[58dvh] min-h-[420px] w-full max-w-[390px]" aria-hidden="true">
      <div className="absolute inset-0 rounded-[30px] bg-white/76" />
    </div>
  );
}
