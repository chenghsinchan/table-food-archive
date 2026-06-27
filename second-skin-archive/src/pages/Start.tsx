import { Link } from "react-router-dom";

// Landing page — no app chrome. Quiet, editorial, full-bleed.
export default function Start() {
  return (
    <div className="paper-grain relative flex min-h-full flex-col">
      <div className="relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-16">
        <span className="mono-label">A body-first wardrobe archive — est. 2026</span>

        <div className="mt-10">
          <span className="tape">No. 01</span>
        </div>

        <h1 className="display mt-5 text-5xl leading-[0.9]">
          Second
          <br />
          Skin
          <br />
          <span className="scribble">Archive</span>
        </h1>

        <p className="mt-8 max-w-xs text-sm leading-relaxed text-ink-soft">
          Your body is your first skin. Clothing is your second.
        </p>
        <p className="mt-3 max-w-xs font-mono text-xs leading-relaxed text-grey">
          understand your body. record your clothes. find what feels like you.
        </p>

        {/* hand-drawn annotation line */}
        <svg
          className="mt-10 h-10 w-40 text-annotate"
          viewBox="0 0 200 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 28 C 50 8, 120 8, 160 24" strokeLinecap="round" />
          <path d="M150 16 L 162 24 L 150 30" strokeLinecap="round" />
        </svg>
        <span className="hand mt-1 text-base text-annotate">
          not a shopping app.
        </span>

        <div className="mt-auto pb-12 pt-10">
          <Link
            to="/start"
            className="flex w-full items-center justify-center bg-ink px-6 py-4 text-sm font-bold uppercase tracking-[0.3em] text-paper"
          >
            Start
          </Link>
          <p className="mt-4 text-center font-mono text-[0.65rem] text-grey">
            a quiet personal archive · no login · stays on your device
          </p>
        </div>
      </div>
    </div>
  );
}
