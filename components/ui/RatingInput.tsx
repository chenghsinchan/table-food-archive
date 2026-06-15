"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type RatingInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
};

export function RatingInput({ value = 0, onChange, readOnly, size = "md" }: RatingInputProps) {
  return (
    <div className="flex items-center gap-1" aria-label={value ? `${value} out of 5 stars` : "No rating"}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const isCompactReadonly = readOnly && size === "sm";
        const className = cn(
          "grid place-items-center rounded-full transition",
          isCompactReadonly ? (filled ? "text-ink" : "text-ink/25") : "text-accent",
          size === "sm" ? "size-5" : "size-8",
          !readOnly && "tap-scale hover:bg-accent/10"
        );

        if (readOnly) {
          return (
            <span key={star} className={className}>
              <Star
                aria-hidden="true"
                size={size === "sm" ? 17 : 19}
                fill={filled ? "currentColor" : "none"}
                strokeWidth={size === "sm" ? 2.25 : 1.8}
              />
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            className={className}
            onClick={() => onChange?.(star)}
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              aria-hidden="true"
              size={size === "sm" ? 15 : 19}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          </button>
        );
      })}
    </div>
  );
}
