import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "neutral" | "up" | "down" | "accent";
  className?: string;
}

/** Compact label / value / optional sub stat block.
 *  Visual variants are driven by the `size` and `tone` classes — all sized via
 *  CSS, so callers stay tiny. */
export function StatBlock({ label, value, sub, size = "md", tone, className }: Props) {
  const cls = ["stat", "stat-" + size, tone ? "stat-" + tone : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <div className="stat-k">{label}</div>
      <div className="stat-v">{value}</div>
      {sub != null && sub !== "" && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
