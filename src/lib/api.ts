import { invoke } from "@tauri-apps/api/core";
import type {
  AppMeta,
  DailyStat,
  DbInfo,
  HourlyStat,
  KeyCount,
  MinuteStat,
  Range,
  TodaySummary,
} from "./types";

export const api = {
  meta: () => invoke<AppMeta>("get_meta"),
  today: () => invoke<TodaySummary>("get_today"),
  daily: (days: number) => invoke<DailyStat[]>("get_daily", { days }),
  keys: (range: Range) => invoke<KeyCount[]>("get_keys", { range }),
  recentMinutes: (limit: number) =>
    invoke<MinuteStat[]>("get_recent_minutes", { limit }),
  weekHourly: () => invoke<HourlyStat[]>("get_week_hourly"),
  dbInfo: () => invoke<DbInfo>("get_db_info"),
};
