import { cn } from "@/lib/utils/cn";

type TagPillProps = {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
};

export function TagPill({ children, active, onClick }: TagPillProps) {
  const className = cn(
    "tap-scale rounded-pill border px-4 py-2 text-sm font-medium transition",
    active
      ? "border-ink bg-ink text-white"
      : "border-border bg-white/56 text-ink hover:border-ink/30 hover:bg-white"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return <span className={className}>{children}</span>;
}
