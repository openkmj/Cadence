/** Display-only assumption for converting pixel travel to physical distance. */
export const ASSUMED_DPI = 96;

export function fmtNum(n: number): string {
  return n.toLocaleString();
}

export function fmtCompact(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function fmtDistance(px: number): string {
  const cm = (px / ASSUMED_DPI) * 2.54;
  if (cm < 100) return cm.toFixed(1) + " cm";
  const m = cm / 100;
  if (m < 1000) return m.toFixed(1) + " m";
  return (m / 1000).toFixed(2) + " km";
}

export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function fmtMinutesActive(min: number): string {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function fmtClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function pct(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return ((part / whole) * 100).toFixed(1) + "%";
}

export function estimateWpm(keysPerMinute: number): number {
  return Math.round(keysPerMinute / 5);
}

/** Local-time ISO date `YYYY-MM-DD`. Avoids UTC drift from `toISOString().slice(0,10)`. */
export function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtRelativeDay(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
