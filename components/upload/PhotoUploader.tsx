"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, Upload } from "lucide-react";

type PhotoUploaderProps = {
  onFilesChange?: (files: File[]) => void;
};

export function PhotoUploader({ onFilesChange }: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  function addFiles(nextFiles: FileList | File[]) {
    const merged = [...files, ...Array.from(nextFiles).filter((file) => file.type.startsWith("image/"))];
    setFiles(merged);
    onFilesChange?.(merged);
  }

  function removeFile(file: File) {
    const nextFiles = files.filter((candidate) => candidate !== file);
    setFiles(nextFiles);
    onFilesChange?.(nextFiles);
  }

  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        addFiles(event.dataTransfer.files);
      }}
      className="rounded-lg border border-dashed border-border bg-white/68 p-3 shadow-[0_18px_48px_rgba(18,21,21,0.08)]"
    >
      <div className="grid min-h-72 place-items-center rounded-lg bg-surface-warm/72 p-4 text-center">
        {previews.length ? (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.map(({ file, url }) => (
              <div key={`${file.name}-${file.lastModified}`} className="group relative overflow-hidden rounded-lg">
                <img src={url} alt={file.name} className="aspect-[4/5] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/78 text-ink opacity-100 shadow-sm backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Remove ${file.name}`}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-xs space-y-3">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-white text-accent shadow-sm">
              <ImagePlus aria-hidden="true" size={27} strokeWidth={1.8} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Photos</h2>
              <p className="text-sm leading-6 text-muted">Add at least one.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="tap-scale flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white"
        >
          <Upload aria-hidden="true" size={17} />
          Library
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="tap-scale flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink"
        >
          <Camera aria-hidden="true" size={17} />
          Camera
        </button>
      </div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => event.target.files && addFiles(event.target.files)} />
      <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => event.target.files && addFiles(event.target.files)} />
    </section>
  );
}
