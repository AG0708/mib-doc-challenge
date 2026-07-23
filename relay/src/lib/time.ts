export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function isoHoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

export function isoMinutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

export function dateOnly(iso: string): string {
  if (!iso || iso === "—") return "—";
  return iso.slice(0, 10);
}

export function formatRelative(iso: string): string {
  if (!iso || iso === "—") return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatWhen(iso: string): string {
  if (!iso || iso === "—") return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
