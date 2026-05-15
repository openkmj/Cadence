import { useMemo } from "react";
import type { HourlyStat } from "../lib/types";
import { fmtCompact, fmtNum } from "../lib/format";

interface Props {
  byHour: HourlyStat[];
  peakHour: number | null;
}

export function HourChart({ byHour, peakHour }: Props) {
  const derived = useMemo(() => {
    const byHourMap = new Map<number, number>();
    for (const s of byHour) byHourMap.set(s.hour, s.keystrokes);
    const slots = Array.from({ length: 24 }, (_, h) => byHourMap.get(h) ?? 0);
    const max = Math.max(1, ...slots);
    const total = slots.reduce((a, b) => a + b, 0);
    const activeHours = slots.filter((v) => v > 0).length;
    return { slots, max, total, activeHours };
  }, [byHour]);

  const currentHour = new Date().getHours();

  return (
    <div className="hour-chart">
      <div className="hour-meta">
        <span>
          <b>{fmtNum(derived.total)}</b> keys today
        </span>
        <span>
          <b>{derived.activeHours}</b> / 24 active hours
        </span>
        {peakHour != null && (
          <span>
            peak <b>{String(peakHour).padStart(2, "0")}:00</b>
            {" · "}
            {fmtCompact(derived.slots[peakHour])} keys
          </span>
        )}
        <span className="dim" style={{ marginLeft: "auto" }}>
          now <b>{String(currentHour).padStart(2, "0")}:00</b>
        </span>
      </div>
      <div className="hour-bars">
        {derived.slots.map((v, h) => {
          const heightPct = (v / derived.max) * 100;
          const isPeak = h === peakHour && v > 0;
          const isCurrent = h === currentHour;
          const isFuture = h > currentHour;
          return (
            <div
              key={h}
              className={
                "hour-bar" +
                (isPeak ? " peak" : "") +
                (isCurrent ? " current" : "") +
                (isFuture ? " future" : "")
              }
              title={`${String(h).padStart(2, "0")}:00 — ${fmtNum(v)} keys`}
            >
              <div className="hour-fill" style={{ height: `${heightPct}%` }} />
              {v > 0 && heightPct > 30 && (
                <span className="hour-val">{fmtCompact(v)}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="hour-axis">
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className={h === currentHour ? "ax-current" : ""}>
            {h === currentHour
              ? String(h).padStart(2, "0")
              : h % 3 === 0
              ? String(h).padStart(2, "0")
              : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
