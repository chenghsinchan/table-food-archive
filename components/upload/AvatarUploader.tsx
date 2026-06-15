"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";

type AvatarUploaderProps = {
  fallbackUrl?: string;
  name?: string;
  onFileChange: (file: File | null) => void;
};

export function AvatarUploader({ fallbackUrl, name = "", onFileChange }: AvatarUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : fallbackUrl), [fallbackUrl, file]);
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "T";

  function updateFile(nextFile?: File) {
    if (!nextFile || !nextFile.type.startsWith("image/")) {
      return;
    }

    setFile(nextFile);
    onFileChange(nextFile);
  }

  return (
    <div className="grid justify-items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="tap-scale relative grid size-24 overflow-hidden rounded-full bg-surface-warm text-muted"
        aria-label="Choose profile photo"
      >
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center">
            {initials ? <span className="text-lg font-semibold text-ink">{initials}</span> : <UserRound size={28} />}
          </span>
        )}
        <span className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-ink text-white">
          <Camera aria-hidden="true" size={15} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => updateFile(event.target.files?.[0])}
      />
    </div>
  );
}
