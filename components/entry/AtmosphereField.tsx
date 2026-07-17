"use client";

import { useRef } from "react";
import type { Atmosphere } from "@/types/food";
import type { Mood } from "@/lib/moods";
import { atmosphereLabel } from "@/lib/moods";
import { cn } from "@/lib/utils/cn";

type AtmosphereFieldProps = {
  value?: Atmosphere;
  onChange?: (value: Atmosphere) => void;
  /** Tints the square with the entry's mood color (16% over paper). */
  mood?: Mood;
  /** Display-only: no pointer handling, softer 40px radius per the handoff. */
  readOnly?: boolean;
  className?: string;
};

/**
 * One-touch atmosphere stamp. Tap or drag sets the dot: x 0 drained → 100
 * energised, y 0 vivid → 100 soothing. Clamped 4–96 so the dot never touches
 * the edge. This is the only way to record mood/energy — no words required.
 */
export function AtmosphereField({ value, onChange, mood, readOnly = false, className }: AtmosphereFieldProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);

  const background = mood
    ? `color-mix(in srgb, ${mood.bg} 16%, #f1eee7)`
    : "#fbf9f4";
  const dotColor = mood ? mood.bg : "#1a1817";

  function setFromPoint(clientX: number, clientY: number) {
    if (readOnly || !onChange) return;

    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((clientY - rect.top) / rect.height) * 100));
    onChange({ x, y });
  }

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
          "relative aspect-square overflow-hidden border border-[#ece8df]",
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
        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a8378]" style={{ writingMode: "vertical-rl", rotate: "180deg" }}>Drained</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a8378]" style={{ writingMode: "vertical-rl" }}>Energised</span>
        {value ? (
          <span
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_6px_rgba(26,24,23,0.35)]"
            style={{ left: `${value.x}%`, top: `${value.y}%`, background: dotColor }}
          />
        ) : (
          <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8a8378]/50" />
        )}
      </div>
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
        {value ? atmosphereLabel(value.x, value.y) : readOnly ? "Not recorded" : "Tap or drag one dot"}
      </p>
    </div>
  );
}
