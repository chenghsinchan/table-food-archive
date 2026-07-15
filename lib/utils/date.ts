export function formatMonth(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function daysSince(date: string) {
  const then = new Date(`${date}T12:00:00`).getTime();
  const now = Date.now();
  return Math.floor((now - then) / 86_400_000);
}

/** "Just now" / "12m ago" / "3h ago" / "5d ago" for a full ISO timestamp. */
export function formatRelativeTime(isoTimestamp: string) {
  const elapsedMs = Date.now() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
