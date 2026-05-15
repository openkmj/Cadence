import type { DailyStat } from "../lib/types";
import { fmtCompact, fmtDistance, fmtNum, fmtRelativeDay } from "../lib/format";

interface Props {
  rows: DailyStat[];
}

export function DailyTable({ rows }: Props) {
  if (rows.length === 0) {
    return <div className="dt-empty">No data yet — start typing!</div>;
  }
  const maxKeys = Math.max(1, ...rows.map((r) => r.keystrokes));
  const today = new Date();
  const isoLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <table className="daily">
      <thead>
        <tr>
          <th>Date</th>
          <th>Keys</th>
          <th>Clicks</th>
          <th>Scrolls</th>
          <th>Travel</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isToday = r.date === isoLocal;
          return (
            <tr key={r.date} className={isToday ? "today" : ""}>
              <td className="dt-date">
                <span
                  className="dt-bar"
                  style={{ width: `${(r.keystrokes / maxKeys) * 56}px` }}
                />
                {fmtRelativeDay(r.date)}
              </td>
              <td>{fmtNum(r.keystrokes)}</td>
              <td>{fmtNum(r.clicks)}</td>
              <td>{fmtNum(r.scrolls)}</td>
              <td>{fmtDistance(r.mouse_distance_px)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td>Σ {rows.length}d</td>
          <td>{fmtCompact(rows.reduce((s, r) => s + r.keystrokes, 0))}</td>
          <td>{fmtCompact(rows.reduce((s, r) => s + r.clicks, 0))}</td>
          <td>{fmtCompact(rows.reduce((s, r) => s + r.scrolls, 0))}</td>
          <td>{fmtDistance(rows.reduce((s, r) => s + r.mouse_distance_px, 0))}</td>
        </tr>
      </tfoot>
    </table>
  );
}
