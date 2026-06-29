"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type AvatarProps = {
  src?: string | null;
  name?: string;
  initials: string;
  className?: string;
};

/**
 * Shows a profile photo, falling back to initials when there is no image or it
 * fails to load. `referrerPolicy="no-referrer"` lets Google account avatars
 * (lh3.googleusercontent.com) load reliably across devices.
 */
export function Avatar({ src, name, initials, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "grid place-items-center overflow-hidden rounded-full bg-white text-xs font-semibold text-ink",
        className
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name ?? ""}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
