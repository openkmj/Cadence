import type { DailyStat } from "./types";
import { toLocalIso } from "./format";

export interface HistorySummary {
  thisWeekKeys: number;
  lastWeekKeys: number;
  wowPct: number | null;
  bestDay: DailyStat | null;
  streak: number;
  trackedDays: number;
  weekdayAverages: number[]; // 7 numbers, index 0 = Sunday
}

export const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dowOf(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDay();
}

export function summarizeHistory(daily: DailyStat[]): HistorySummary {
  const todayIso = toLocalIso(new Date());
  const pastDaily = daily.filter((d) => d.date !== todayIso);

  const thisWeek = pastDaily.slice(0, 7);
  const lastWeek = pastDaily.slice(7, 14);

  const thisWeekKeys = thisWeek.reduce((s, d) => s + d.keystrokes, 0);
  const lastWeekKeys = lastWeek.reduce((s, d) => s + d.keystrokes, 0);
  const wowPct =
    lastWeekKeys === 0 ? null : ((thisWeekKeys - lastWeekKeys) / lastWeekKeys) * 100;

  const bestDay =
    pastDaily.length === 0
      ? null
      : pastDaily.reduce((a, b) => (b.keystrokes > a.keystrokes ? b : a));

  // Streak: consecutive days ending yesterday with > 0 keystrokes
  const dailyByDate = new Map(pastDaily.map((d) => [d.date, d.keystrokes]));
  let streak = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const v = dailyByDate.get(toLocalIso(cursor));
    if (v && v > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  const sumByDow = [0, 0, 0, 0, 0, 0, 0];
  const cntByDow = [0, 0, 0, 0, 0, 0, 0];
  for (const d of pastDaily) {
    const dow = dowOf(d.date);
    sumByDow[dow] += d.keystrokes;
    cntByDow[dow] += 1;
  }
  const weekdayAverages = sumByDow.map((s, i) =>
    cntByDow[i] === 0 ? 0 : Math.round(s / cntByDow[i]),
  );

  return {
    thisWeekKeys,
    lastWeekKeys,
    wowPct,
    bestDay,
    streak,
    trackedDays: pastDaily.length,
    weekdayAverages,
  };
}
