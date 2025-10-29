export function formatDate(d?: string | Date | null, fallback = "—") {
  if (!d) return fallback;
  const date = new Date(d);
  if (isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
