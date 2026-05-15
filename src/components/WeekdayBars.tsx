import { fmtCompact } from "../lib/format";
import { DOW_LABELS } from "../lib/history";

interface Props {
  /** 7 numbers, index 0 = Sunday */
  weekdayAverages: number[];
}

export function WeekdayBars({ weekdayAverages }: Props) {
  // Reorder to Mon-first for a more natural work-week view
  const monFirst = [1, 2, 3, 4, 5, 6, 0];
  const max = Math.max(1, ...weekdayAverages);
  const todayDow = new Date().getDay();

  return (
    <div className="weekday-bars">
      <div className="wb-grid">
        {monFirst.map((dow) => {
          const v = weekdayAverages[dow];
          const heightPct = (v / max) * 100;
          const isToday = dow === todayDow;
          return (
            <div
              key={dow}
              className={"wb-col" + (isToday ? " wb-today" : "")}
              title={`${DOW_LABELS[dow]} avg — ${fmtCompact(v)} keys`}
            >
              <div className="wb-stack">
                <span className="wb-value">{fmtCompact(v)}</span>
                <div className="wb-track">
                  <div
                    className="wb-fill"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              </div>
              <div className="wb-label">{DOW_LABELS[dow]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
