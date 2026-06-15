import { cn } from "@/lib/utils/cn";

type MoodPillProps = {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
};

export function MoodPill({ children, active, onClick }: MoodPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tap-scale rounded-pill px-5 py-3 text-sm font-semibold transition sm:text-base",
        active
          ? "bg-accent text-white shadow-soft"
          : "bg-surface-warm text-ink hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}
