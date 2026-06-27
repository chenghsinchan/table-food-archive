import { useRef } from "react";
import { fileToDataUrl } from "@/lib/ai";

// Reusable photo input that returns a data URL (localStorage MVP).
// TODO(ai): on upload, optionally run clothing/body recognition here.
export default function PhotoUpload({
  value,
  onChange,
  label = "Upload photo",
  aspect = "aspect-[3/4]",
}: {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  aspect?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  async function handle(file?: File) {
    if (!file) return;
    onChange(await fileToDataUrl(file));
  }

  return (
    <div className="relative z-[1]">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`frame w-full ${aspect} overflow-hidden bg-paper-dim flex items-center justify-center`}
      >
        {value ? (
          <img
            src={value}
            alt=""
            className="h-full w-full object-cover grayscale-[15%]"
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-grey">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="3" y="5" width="18" height="14" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="M3 17l5-4 4 3 3-2 6 5" />
            </svg>
            <span className="mono-label">{label}</span>
          </span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="absolute right-2 top-2 tape"
        >
          replace
        </button>
      )}
    </div>
  );
}
