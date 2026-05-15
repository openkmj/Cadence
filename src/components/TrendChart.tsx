import { useMemo } from "react";
import type { DailyStat } from "../lib/types";
import { fmtCompact } from "../lib/format";
import { PALETTE } from "../lib/palette";

interface Props {
  /** Newest-first as returned by the backend. */
  daily: DailyStat[];
  windowSize?: number;
}

const W = 600;
const H = 140;
const PAD_Y = 3; // vertical padding so the line never clips the panel border
const MA_WINDOW = 7;

export function TrendChart({ daily, windowSize = 30 }: Props) {
  const { values, ma, max } = useMemo(() => {
    const series = [...daily].reverse().slice(-windowSize);
    const values = series.map((d) => d.keystrokes);
    const max = Math.max(1, ...values);
    const ma = values.map((_, i) => {
      const lo = Math.max(0, i - (MA_WINDOW - 1));
      const slice = values.slice(lo, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
    return { values, ma, max };
  }, [daily, windowSize]);

  if (values.length === 0) {
    return <div className="trend-empty">No history yet</div>;
  }

  const step = values.length > 1 ? W / (values.length - 1) : 0;
  const linePts = (vs: number[]) =>
    vs
      .map(
        (v, i) =>
          `${(i * step).toFixed(2)},${(H - (v / max) * (H - 2 * PAD_Y) - PAD_Y).toFixed(2)}`,
      )
      .join(" ");
  const areaPts = `0,${H} ${linePts(values)} ${W.toFixed(2)},${H}`;

  return (
    <div className="trend-chart">
      <div className="trend-meta">
        <span className="tm-k">
          {values.length}d · max <b>{fmtCompact(max)}</b>
        </span>
        <span className="tm-legend">
          <span className="tm-dot tm-dot-raw" /> daily
          <span className="tm-dot tm-dot-ma" /> {MA_WINDOW}-day MA
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: "block" }}
      >
        <polygon points={areaPts} fill={PALETTE.accent} fillOpacity={0.1} />
        <polyline points={linePts(values)} fill="none" stroke={`${PALETTE.accent}8c`} strokeWidth={1.2} />
        <polyline
          points={linePts(ma)}
          fill="none"
          stroke={PALETTE.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
