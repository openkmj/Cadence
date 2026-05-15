export type Platform = "macos" | "windows" | "unknown";
export type Range = "today" | "week" | "month" | "all";

export interface AppMeta {
  platform: Platform;
  started_at_unix: number;
  schema_version: number;
  db_path: string;
}

export interface HourlyStat {
  date: string;
  hour: number;
  keystrokes: number;
  left_clicks: number;
  right_clicks: number;
  middle_clicks: number;
  other_clicks: number;
  scrolls: number;
  mouse_distance_px: number;
}

export interface TodaySummary {
  date: string;
  keystrokes: number;
  left_clicks: number;
  right_clicks: number;
  middle_clicks: number;
  other_clicks: number;
  scrolls: number;
  mouse_distance_px: number;
  by_hour: HourlyStat[];
  active_minutes: number;
  peak_minute_keys: number;
  peak_minute: [number, number] | null;
}

export interface DailyStat {
  date: string;
  keystrokes: number;
  clicks: number;
  scrolls: number;
  mouse_distance_px: number;
}

export interface MinuteStat {
  date: string;
  hour: number;
  minute: number;
  keystrokes: number;
  clicks: number;
  scrolls: number;
  mouse_distance_px: number;
}

export interface KeyCount {
  keycode: number;
  count: number;
}

export interface DbInfo {
  size_bytes: number;
  minute_rows: number;
  key_rows: number;
  schema_version: number;
}
