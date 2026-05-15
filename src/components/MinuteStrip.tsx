import { useMemo } from "react";
import type { MinuteStat } from "../lib/types";
import { fmtClock, fmtNum } from "../lib/format";

interface Props {
  /** Newest first as returned by the backend. */
  minutes: MinuteStat[];
  /** How many minutes back to show (most recent N). */
  window?: number;
}

export function MinuteStrip({ minutes, window = 60 }: Props) {
  const { strip, max } = useMemo(() => {
    const now = new Date();
    const nowHour = now.getHours();
    const nowMin = now.getMinutes();

    const lookup = new Map<number, MinuteStat>();
    for (const m of minutes) lookup.set(m.hour * 60 + m.minute, m);

    const nowIdx = nowHour * 60 + nowMin;
    const strip: { idx: number; keys: number; hour: number; minute: number }[] = [];
    for (let i = window - 1; i >= 0; i--) {
      const idx = nowIdx - i;
      if (idx < 0) {
        strip.push({ idx: -1, keys: 0, hour: 0, minute: 0 });
        continue;
      }
      const h = Math.floor(idx / 60);
      const m = idx % 60;
      const stat = lookup.get(idx);
      strip.push({ idx, keys: stat?.keystrokes ?? 0, hour: h, minute: m });
    }
    const max = strip.reduce((a, b) => Math.max(a, b.keys), 0);
    return { strip, max };
  }, [minutes, window]);

  return (
    <div className="minute-strip">
      <div className="ms-chart">
        {strip.map((s, i) => {
          const heightPct = max > 0 ? (s.keys / max) * 100 : 0;
          return (
            <div
              key={i}
              className="ms-bar"
              title={
                s.idx < 0
                  ? "—"
                  : `${fmtClock(s.hour, s.minute)} — ${fmtNum(s.keys)} keys`
              }
            >
              <div className="ms-fill" style={{ height: `${heightPct}%` }} />
            </div>
          );
        })}
      </div>
      <div className="ms-axis">
        <span>−{window}m</span>
        <span>−{Math.floor(window / 2)}m</span>
        <span>now</span>
      </div>
    </div>
  );
}
