"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Atmosphere } from "@/types/food";
import { AtmosphereField } from "@/components/entry/AtmosphereField";
import { moodByKey } from "@/lib/moods";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "table-onboarded-v1";

/** Has this browser already seen the walkthrough? */
export function hasSeenOnboarding() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

const cozy = moodByKey("cozy");

/**
 * A one-time, three-step welcome shown over the app the first time anyone
 * opens it (new or existing user). Skipping or finishing reveals the real
 * app underneath — for a new user that's the empty Home. Dots/Skip live on
 * steps 1–3 only.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [atmosphere, setAtmosphere] = useState<Atmosphere>({ x: 50, y: 50 });

  function finish() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage failures — worst case the walkthrough shows again
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f1eee7] px-6 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* progress dots + skip (steps 1–3) */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn("h-1.5 rounded-full transition-all", index === step ? "w-5 bg-ink" : "w-1.5 bg-ink/25")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={finish}
          className="tap-scale font-mono text-[10px] uppercase tracking-[0.18em] text-muted"
        >
          Skip
        </button>
      </div>

      {step === 0 ? <StepWelcome onBegin={() => setStep(1)} /> : null}
      {step === 1 ? (
        <StepFlip flipped={flipped} onFlip={() => setFlipped(true)} onContinue={() => setStep(2)} />
      ) : null}
      {step === 2 ? <StepAtmosphere value={atmosphere} onChange={setAtmosphere} onContinue={finish} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ step 1 */

function StepWelcome({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-7 flex items-center gap-2">
          {(["cozy", "comfort", "fresh", "sweet"] as const).map((key) => (
            <span key={key} className="size-2.5 rounded-full" style={{ background: moodByKey(key).bg }} />
          ))}
        </div>
        <h1 className="table-wordmark text-[56px] leading-none text-ink">TABLE</h1>
        <p className="mt-5 max-w-[26ch] text-[15px] leading-[1.6] text-[#6d675c]">
          A quiet place to keep what you taste, where you were, and how it felt.
        </p>
      </div>
      <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>
    </div>
  );
}

/* ------------------------------------------------------------------ step 2 */

function StepFlip({ flipped, onFlip, onContinue }: { flipped: boolean; onFlip: () => void; onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="pt-4 text-center">
        <h2 className="font-serif text-[26px] italic leading-[1.2] text-ink">Tap a memory to turn it over.</h2>
        <p className="mx-auto mt-2 max-w-[30ch] text-[13px] leading-[1.5] text-[#6d675c]">
          Every entry hides its mood on the back.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <DemoCard flipped={flipped} onFlip={onFlip} />
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
            flipped ? "text-ink" : "text-muted"
          )}
        >
          {flipped ? (
            <span className="inline-flex items-center gap-1.5">
              Nicely done <ArrowRight aria-hidden="true" size={12} />
            </span>
          ) : (
            "Tap the card"
          )}
        </p>
      </div>

      <PrimaryButton onClick={onContinue} disabled={!flipped}>
        Continue
      </PrimaryButton>
    </div>
  );
}

function DemoCard({ flipped, onFlip }: { flipped: boolean; onFlip: () => void }) {
  return (
    <div className="h-[300px] w-[220px]" style={{ perspective: "1400px" }}>
      <div
        className="relative size-full"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform .6s cubic-bezier(.5,.05,.2,1)"
        }}
      >
        {/* front */}
        <button
          type="button"
          onClick={onFlip}
          aria-label="Flip the demo card"
          className="absolute inset-0 overflow-hidden rounded-[24px] text-left shadow-[0_16px_30px_-14px_rgba(26,24,23,0.3)]"
          style={{
            backfaceVisibility: "hidden",
            opacity: flipped ? 0 : 1,
            transition: "opacity 0s .3s",
            background: "linear-gradient(160deg,#e7d9a6 0%,#d8b45f 55%,#b98b3e)"
          }}
        >
          {/* Riso pho illustration; falls back to the warm gradient if absent. */}
          <img
            src="/onboarding/chicken-pho.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(12,10,9,0.62) 0%, rgba(12,10,9,0.1) 42%, transparent 60%)" }}
          />
          <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(12,10,9,0.38)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white backdrop-blur-[6px]">
            <span className="size-1.5 rounded-full" style={{ background: cozy.bg }} />
            {cozy.name}
          </span>
          <span className="absolute inset-x-3.5 bottom-3.5 block text-[#fbf9f4]">
            <span className="block font-serif text-[21px] font-semibold italic leading-[1.1]">Chicken Pho</span>
            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.12em] opacity-80">12 Jul &middot; At home</span>
          </span>
        </button>

        {/* back */}
        <button
          type="button"
          onClick={onFlip}
          aria-label="Flip the demo card back"
          className="absolute inset-0 flex flex-col rounded-[24px] p-4 text-left shadow-[0_16px_30px_-14px_rgba(26,24,23,0.3)]"
          style={{
            background: cozy.bg,
            color: cozy.fg,
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            opacity: flipped ? 1 : 0,
            transition: "opacity 0s .3s"
          }}
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] opacity-70">&#8470; 01 &middot; {cozy.name}</span>
          <span className="mt-2 font-serif text-[22px] font-semibold italic leading-[1.1]">Chicken Pho</span>
          <span className="mt-2 font-serif text-[13px] italic leading-[1.4] opacity-90">
            &ldquo;We were both tired, but making this helped.&rdquo;
          </span>
          <span className="flex-1" />
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] opacity-70">12 Jul &middot; At home</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 3 */

function StepAtmosphere({
  value,
  onChange,
  onContinue
}: {
  value: Atmosphere;
  onChange: (value: Atmosphere) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="pt-4 text-center">
        <h2 className="font-serif text-[26px] italic leading-[1.2] text-ink">One tap says more than words.</h2>
        <p className="mx-auto mt-2 max-w-[32ch] text-[13px] leading-[1.5] text-[#6d675c]">
          Drag the dot to record the mood — no writing required.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-[220px]">
          <AtmosphereField value={value} onChange={onChange} mood={cozy} />
        </div>
      </div>

      <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
    </div>
  );
}

/* ------------------------------------------------------------------ shared */

function PrimaryButton({
  children,
  onClick,
  disabled = false
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "tap-scale flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
        disabled ? "cursor-not-allowed bg-[#dcd7cc] text-white/80" : "bg-ink text-[#fbf9f4]"
      )}
    >
      {children}
      {!disabled ? <ArrowRight aria-hidden="true" size={14} /> : null}
    </button>
  );
}
