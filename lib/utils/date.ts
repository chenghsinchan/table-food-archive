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
