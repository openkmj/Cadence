import { useMemo } from "react";
import type { HourlyStat } from "../lib/types";
import { fmtNum, toLocalIso } from "../lib/format";
import { DOW_LABELS } from "../lib/history";

interface Props {
  hourly: HourlyStat[]; // last 7 days, oldest first
}

export function WeekHeatmap({ hourly }: Props) {
  const { days, max } = useMemo(() => {
    const today = new Date();
    const days: { date: string; dow: number; mmdd: string; hours: number[] }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        date: toLocalIso(d),
        dow: d.getDay(),
        mmdd: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`,
        hours: Array(24).fill(0),
      });
    }
    const byDate = new Map(days.map((d) => [d.date, d]));

    let max = 0;
    for (const stat of hourly) {
      const day = byDate.get(stat.date);
      if (!day) continue;
      day.hours[stat.hour] = stat.keystrokes;
      if (stat.keystrokes > max) max = stat.keystrokes;
    }
    return { days, max };
  }, [hourly]);

  return (
    <div className="week-heatmap">
      <div className="wh-axis-top">
        <div className="wh-corner" />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="wh-htick">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </div>
        ))}
      </div>
      {days.map((d, i) => {
        const isToday = i === days.length - 1;
        return (
          <div key={d.date} className={"wh-row" + (isToday ? " today" : "")}>
            <div className="wh-lbl">
              <span className="wh-dow">{DOW_LABELS[d.dow]}</span>
              <span className="wh-mmdd">{d.mmdd}</span>
            </div>
            {d.hours.map((v, h) => {
              const t = max > 0 ? v / max : 0;
              const op = v === 0 ? 0 : 0.18 + 0.82 * Math.pow(t, 0.55);
              return (
                <div
                  key={h}
                  className="wh-cell"
                  style={{
                    background:
                      v === 0 ? "var(--panel-2)" : `rgba(94,234,212,${op})`,
                  }}
                  title={`${d.mmdd} ${String(h).padStart(2, "0")}:00 — ${fmtNum(v)} keys`}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
