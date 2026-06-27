// Small editorial UI primitives shared across pages.
import type { ReactNode } from "react";

export function Tape({ children }: { children: ReactNode }) {
  return <span className="tape">{children}</span>;
}

export function MonoLabel({ children }: { children: ReactNode }) {
  return <span className="mono-label">{children}</span>;
}

export function Section({
  title,
  index,
  children,
}: {
  title: string;
  index?: string;
  children: ReactNode;
}) {
  return (
    <section className="relative z-[1] fade-up">
      <div className="flex items-baseline gap-2 mb-3">
        {index && <span className="mono-label text-mark">{index}</span>}
        <h2 className="display text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "solid",
  type = "button",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40";
  const styles =
    variant === "solid"
      ? "bg-ink text-paper hover:bg-ink-soft"
      : "frame bg-transparent text-ink hover:bg-ink hover:text-paper";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mono-label block mb-1">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={`w-full frame bg-paper/40 px-3 py-2 text-sm outline-none focus:bg-paper ${
        props.className ?? ""
      }`}
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full frame bg-paper/40 px-3 py-2 text-sm outline-none focus:bg-paper resize-none ${
        props.className ?? ""
      }`}
    />
  );
}

/** A labelled 0–10 slider with the value in mono on the right. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="mono-label">{label}</span>
        <span className="font-mono text-xs text-ink">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** Empty-state block used when an archive surface has no data yet. */
export function Empty({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="frame border-dashed p-6 text-center relative z-[1]">
      <p className="mono-label">{children}</p>
    </div>
  );
}
