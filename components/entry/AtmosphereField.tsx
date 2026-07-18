"use client";

import { useRef } from "react";
import type { Atmosphere } from "@/types/food";
import type { Mood } from "@/lib/moods";
import { atmosphereLabel, moodForAtmosphere } from "@/lib/moods";
import { cn } from "@/lib/utils/cn";

type AtmosphereFieldProps = {
  value?: Atmosphere;
  onChange?: (value: Atmosphere) => void;
  /** Called with the mood the dot's position maps to, as it moves. */
  onMoodChange?: (mood: Mood) => void;
  /** Force a mood colour (e.g. read-only card back). Otherwise it's derived live from the dot. */
  mood?: Mood;
  /** Display-only: no pointer handling, softer 40px radius per the handoff. */
  readOnly?: boolean;
  className?: string;
};

/**
 * One-touch atmosphere stamp. Tap or drag sets the dot: x 0 drained → 100
 * energised, y 0 vivid → 100 soothing. Clamped 4–96 so the dot never touches
 * the edge. The field colours itself live from the mood the dot lands in, so
 * the stamp and the six-mood palette are one system.
 */
export function AtmosphereField({ value, onChange, onMoodChange, mood, readOnly = false, className }: AtmosphereFieldProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);

  // Colour follows the dot: use the forced mood if given, else derive from the
  // current position; before the first tap the field stays neutral paper.
  const activeMood = mood ?? (value ? moodForAtmosphere(value.x, value.y) : undefined);
  const background = activeMood ? `color-mix(in srgb, ${activeMood.bg} 16%, #f1eee7)` : "#fbf9f4";
  const dotColor = activeMood ? activeMood.bg : "#1a1817";

  function setFromPoint(clientX: number, clientY: number) {
    if (readOnly || !onChange) return;

    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((clientY - rect.top) / rect.height) * 100));
    onChange({ x, y });
    onMoodChange?.(moodForAtmosphere(x, y));
  }

  const labelOnLeft = value ? value.x > 55 : false;

  return (
    <div className={cn("mx-auto w-full", readOnly ? "max-w-[180px]" : "max-w-[240px]", className)}>
      <div
        ref={fieldRef}
        role={readOnly ? "img" : "application"}
        aria-label={
          value
            ? `Atmosphere: ${atmosphereLabel(value.x, value.y)}`
            : "Atmosphere: horizontal from drained to energised, vertical from vivid to soothing"
        }
        className={cn(
          "relative aspect-square overflow-hidden border border-[#ece8df] transition-colors duration-150",
          readOnly ? "rounded-[40px]" : "cursor-crosshair touch-none rounded-[18px]"
        )}
        style={{ background }}
        onPointerDown={(event) => {
          if (readOnly) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromPoint(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (readOnly) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPoint(event.clientX, event.clientY);
        }}
      >
        <span className="absolute inset-y-4 left-1/2 w-px bg-[#dcd7cc]" />
        <span className="absolute inset-x-4 top-1/2 h-px bg-[#dcd7cc]" />
        <span className="absolute left-1/2 top-2 -translate-x-1/2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a8378]">Vivid</span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a8378]">Soothing</span>
        <span className="absolute left-2 top-1/2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a8378]" style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)" }}>Drained</span>
        <span className="absolute right-2 top-1/2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a8378]" style={{ writingMode: "vertical-rl", transform: "translateY(-50%)" }}>Energised</span>
        {value ? (
          <>
            <span
              className="absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_6px_rgba(26,24,23,0.35)]"
              style={{ left: `${value.x}%`, top: `${value.y}%`, background: dotColor }}
            />
            {!readOnly ? (
              <span
                className="pointer-events-none absolute z-20 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#fbf9f4]/92 px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.12em] text-ink shadow-[0_1px_4px_rgba(26,24,23,0.14)]"
                style={{
                  left: `${value.x}%`,
                  top: `${value.y}%`,
                  transform: `translate(${labelOnLeft ? "calc(-100% - 14px)" : "14px"}, -50%)`
                }}
              >
                {activeMood ? `${activeMood.name} · ${atmosphereLabel(value.x, value.y)}` : atmosphereLabel(value.x, value.y)}
              </span>
            ) : null}
          </>
        ) : (
          <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8a8378]/50" />
        )}
      </div>
      {readOnly ? (
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
          {value ? atmosphereLabel(value.x, value.y) : "Not recorded"}
        </p>
      ) : !value ? (
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-muted">Tap or drag one dot</p>
      ) : null}
    </div>
  );
}
