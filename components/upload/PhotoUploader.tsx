"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import type { PhotoSource } from "@/types/analytics";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type PhotoUploaderProps = {
  onFilesChange?: (files: File[]) => void;
  /** Where the most recently added photo(s) came from — for analytics only. */
  onSourceChange?: (source: PhotoSource) => void;
};

export function PhotoUploader({ onFilesChange, onSourceChange }: PhotoUploaderProps) {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  function addFiles(nextFiles: FileList | File[], source: PhotoSource) {
    const merged = [...files, ...Array.from(nextFiles).filter((file) => file.type.startsWith("image/"))];
    setFiles(merged);
    onFilesChange?.(merged);
    onSourceChange?.(source);
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
        addFiles(event.dataTransfer.files, "drop");
      }}
      className="rounded-[22px] border border-border bg-[#fbf9f4] p-[3px]"
    >
      <div className="grid min-h-72 place-items-center overflow-hidden rounded-[18px] bg-surface-warm/45 p-3 text-center">
        {previews.length ? (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.map(({ file, url }) => (
              <div key={`${file.name}-${file.lastModified}`} className="group relative overflow-hidden">
                <img src={url} alt={file.name} className="aspect-[4/5] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/86 text-ink opacity-100 transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Remove ${file.name}`}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-xs space-y-3">
            <div className="mx-auto grid size-14 place-items-center rounded-full border border-border bg-[#fbf9f4] text-ink">
              <ImagePlus aria-hidden="true" size={27} strokeWidth={1.8} />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl italic">{t("photo.title")}</h2>
              <p className="text-sm leading-6 text-muted">{t("photo.sub")}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="tap-scale flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-ink px-4 text-sm font-semibold text-white"
        >
          <ImagePlus aria-hidden="true" size={17} />
          {t("photo.library")}
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="tap-scale flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-border bg-white px-4 text-sm font-semibold text-ink"
        >
          <Camera aria-hidden="true" size={17} />
          {t("photo.camera")}
        </button>
      </div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => event.target.files && addFiles(event.target.files, "library")} />
      <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => event.target.files && addFiles(event.target.files, "camera")} />
    </section>
  );
}
