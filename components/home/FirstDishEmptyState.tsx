import Link from "next/link";
import { Plus } from "lucide-react";

type FirstDishEmptyStateProps = {
  message?: string;
};

export function FirstDishEmptyState({ message }: FirstDishEmptyStateProps) {
  return (
    <section className="relative mx-auto grid min-h-[62dvh] w-full max-w-md place-items-center px-2">
      {/* faint dashed "slots" hinting the grid will fill up */}
      <div className="pointer-events-none absolute inset-x-1 top-1 bottom-10 grid grid-cols-2 gap-3 opacity-45" aria-hidden="true">
        <div className="card-deckle row-span-2 grid place-items-center rounded-[14px] border-[1.6px] border-dashed border-border font-serif text-2xl italic text-border">1</div>
        <div className="card-deckle grid place-items-center rounded-[14px] border-[1.6px] border-dashed border-border font-serif text-2xl italic text-border">2</div>
        <div className="card-deckle grid place-items-center rounded-[14px] border-[1.6px] border-dashed border-border font-serif text-2xl italic text-border">3</div>
      </div>

      {/* the cut-paper card */}
      <div className="relative w-[86%] max-w-[340px] -rotate-1">
        <div className="card-deckle absolute inset-0 rounded-[18px] border border-border bg-[#fbf7ee] shadow-[0_16px_30px_-18px_rgba(17,17,17,0.28)]" />
        <div className="relative px-6 py-7 text-center">
          <svg viewBox="0 0 200 140" className="mx-auto mb-2 block h-[104px] w-[150px]" aria-hidden="true">
            <ellipse cx="100" cy="112" rx="60" ry="11" fill="rgba(17,17,17,0.06)" />
            <g filter="url(#tableDeckle)">
              <ellipse cx="100" cy="86" rx="68" ry="30" fill="#ece2d0" stroke="#cabfa9" />
              <ellipse cx="100" cy="84" rx="66" ry="29" fill="none" stroke="#cdc2ac" strokeWidth="2" />
              <ellipse cx="100" cy="83" rx="44" ry="18" fill="#f6f1e8" stroke="#d8ccb6" strokeWidth="1.5" />
            </g>
            <g filter="url(#tableDeckle)">
              <path d="M99 83 q-4 -30 -20 -44 q22 6 24 30 q10 -20 30 -22 q-8 22 -30 34 z" fill="#9aad8e" />
              <path d="M99 84 q-2 -20 -3 -40" fill="none" stroke="#6f8468" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          </svg>

          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#6f8468]">Your table is set</p>
          <h2 className="mt-2 font-serif text-3xl italic leading-tight text-ink">Add your first dish</h2>
          <p className="mx-auto mt-2 max-w-[26ch] text-sm leading-6 text-muted">
            {message ?? "Snap something you cooked, ordered, or want to cook again. It lands here, just for your table."}
          </p>

          <Link
            href="/add?returnTo=%2F"
            className="tap-scale mt-5 inline-flex items-center gap-2 rounded-full bg-ink py-2.5 pl-3 pr-5 text-sm font-semibold text-white"
          >
            <span className="grid size-6 place-items-center rounded-full bg-white text-ink">
              <Plus aria-hidden="true" size={15} strokeWidth={2.4} />
            </span>
            Add a dish
          </Link>
        </div>
      </div>
    </section>
  );
}
