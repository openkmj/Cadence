import { fmtNum, pct } from "../lib/format";

interface Props {
  left: number;
  right: number;
  middle: number;
  other: number;
  scrolls: number;
}

export function ClickBreakdown({ left, right, middle, other, scrolls }: Props) {
  const total = left + right + middle + other;
  const max = Math.max(1, left, right, middle, other);

  return (
    <div className="click-breakdown">
      <Row label="Left" value={left} max={max} total={total} className="cb-l" />
      <Row label="Right" value={right} max={max} total={total} className="cb-r" />
      <Row label="Middle" value={middle} max={max} total={total} className="cb-m" />
      <Row label="Other" value={other} max={max} total={total} className="cb-o" />
      <div className="cb-divider" />
      <div className="cb-scroll">
        <span className="cb-scroll-k">Scrolls</span>
        <span className="cb-scroll-v">{fmtNum(scrolls)}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  max,
  total,
  className,
}: {
  label: string;
  value: number;
  max: number;
  total: number;
  className: string;
}) {
  const w = max === 0 ? 0 : (value / max) * 100;
  return (
    <div className={"cb-row " + className}>
      <span className="cb-lbl">{label}</span>
      <span className="cb-track">
        <span className="cb-fill" style={{ width: `${w}%` }} />
      </span>
      <span className="cb-val">{fmtNum(value)}</span>
      <span className="cb-pct">{pct(value, total)}</span>
    </div>
  );
}
