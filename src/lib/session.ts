import type { MinuteStat } from "./types";

export interface Session {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  durationMin: number;
  keys: number;
}

export interface SessionStats {
  sessions: Session[];
  totalActiveMin: number;
  longestSessionMin: number;
  longestSession: Session | null;
  firstActivity: { hour: number; minute: number } | null;
  lastActivity: { hour: number; minute: number } | null;
  averageBreakMin: number;
  longestBreakMin: number;
}

const DEFAULT_IDLE_GAP_MIN = 3;

/** Group consecutive active minutes into sessions, with idle gaps >= idleGap min as separators. */
export function detectSessions(
  minutes: MinuteStat[],
  idleGapMin = DEFAULT_IDLE_GAP_MIN,
): SessionStats {
  // Sort ascending by hour, minute
  const sorted = [...minutes].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  const active = sorted.filter(
    (m) => m.keystrokes + m.clicks + m.scrolls > 0,
  );

  if (active.length === 0) {
    return {
      sessions: [],
      totalActiveMin: 0,
      longestSessionMin: 0,
      longestSession: null,
      firstActivity: null,
      lastActivity: null,
      averageBreakMin: 0,
      longestBreakMin: 0,
    };
  }

  const sessions: Session[] = [];
  const breaks: number[] = [];

  let curStart = active[0];
  let curLastIdx = active[0].hour * 60 + active[0].minute;
  let curKeys = active[0].keystrokes;

  for (let i = 1; i < active.length; i++) {
    const m = active[i];
    const idx = m.hour * 60 + m.minute;
    if (idx - curLastIdx > idleGapMin) {
      // gap → close session
      sessions.push({
        startHour: curStart.hour,
        startMinute: curStart.minute,
        endHour: Math.floor(curLastIdx / 60),
        endMinute: curLastIdx % 60,
        durationMin: curLastIdx - (curStart.hour * 60 + curStart.minute) + 1,
        keys: curKeys,
      });
      breaks.push(idx - curLastIdx);
      curStart = m;
      curKeys = m.keystrokes;
    } else {
      curKeys += m.keystrokes;
    }
    curLastIdx = idx;
  }
  // Close the final session
  sessions.push({
    startHour: curStart.hour,
    startMinute: curStart.minute,
    endHour: Math.floor(curLastIdx / 60),
    endMinute: curLastIdx % 60,
    durationMin: curLastIdx - (curStart.hour * 60 + curStart.minute) + 1,
    keys: curKeys,
  });

  const totalActiveMin = sessions.reduce((s, x) => s + x.durationMin, 0);
  const longest = sessions.reduce((a, b) => (b.durationMin > a.durationMin ? b : a), sessions[0]);
  const averageBreakMin =
    breaks.length === 0 ? 0 : Math.round(breaks.reduce((a, b) => a + b, 0) / breaks.length);
  const longestBreakMin = breaks.length === 0 ? 0 : Math.max(...breaks);

  return {
    sessions,
    totalActiveMin,
    longestSessionMin: longest.durationMin,
    longestSession: longest,
    firstActivity: { hour: active[0].hour, minute: active[0].minute },
    lastActivity: {
      hour: active[active.length - 1].hour,
      minute: active[active.length - 1].minute,
    },
    averageBreakMin,
    longestBreakMin,
  };
}
