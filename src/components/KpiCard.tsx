interface Props {
  label: string;
  value: string;
  sub?: string;
  spark?: number[];
  accent?: "teal" | "blue" | "amber" | "violet" | "pink";
}

const ACCENTS: Record<NonNullable<Props["accent"]>, string> = {
  teal: "var(--accent)",
  blue: "#7aa2ff",
  amber: "#fbbf24",
  violet: "#a78bfa",
  pink: "#fb7185",
};

export function KpiCard({ label, value, sub, spark, accent = "teal" }: Props) {
  const color = ACCENTS[accent];
  return (
    <div className="kpi" style={{ borderLeftColor: color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {spark && spark.length > 1 && <Sparkline values={spark} color={color} />}
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const w = 100;
  const h = 28;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const linePts = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(2)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(2)}`,
    )
    .join(" ");
  const areaPts = `0,${h} ${linePts} ${w},${h}`;

  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={areaPts} fill={color} fillOpacity={0.14} />
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
