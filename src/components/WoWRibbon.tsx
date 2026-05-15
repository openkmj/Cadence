import type { HistorySummary } from "../lib/history";
import { fmtCompact, fmtNum, fmtRelativeDay } from "../lib/format";
import { StatBlock } from "./StatBlock";

interface Props {
  summary: HistorySummary;
}

export function WoWRibbon({ summary }: Props) {
  const wowTone =
    summary.wowPct == null ? "neutral" : summary.wowPct >= 0 ? "up" : "down";
  const wowText =
    summary.wowPct == null
      ? "—"
      : `${summary.wowPct >= 0 ? "▲" : "▼"} ${Math.abs(summary.wowPct).toFixed(0)}%`;

  return (
    <div className="wow-ribbon">
      <StatBlock
        label="This week"
        value={fmtCompact(summary.thisWeekKeys)}
        sub={
          <span className={"wc-delta wc-" + wowTone}>
            {wowText} vs last week
          </span>
        }
        size="lg"
        className="wow-cell"
      />
      <StatBlock
        label="Best day"
        value={summary.bestDay ? fmtCompact(summary.bestDay.keystrokes) : "—"}
        sub={summary.bestDay ? fmtRelativeDay(summary.bestDay.date) : "—"}
        size="lg"
        className="wow-cell"
      />
      <StatBlock
        label="Streak"
        value={`${summary.streak}d`}
        sub="consecutive active days"
        size="lg"
        className="wow-cell"
      />
      <StatBlock
        label="Tracked"
        value={`${summary.trackedDays}d`}
        sub={`${fmtNum(summary.thisWeekKeys + summary.lastWeekKeys)} keys / 14d`}
        size="lg"
        className="wow-cell"
      />
    </div>
  );
}
