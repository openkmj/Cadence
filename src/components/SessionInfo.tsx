import type { SessionStats } from "../lib/session";
import { fmtClock, fmtMinutesActive } from "../lib/format";
import { StatBlock } from "./StatBlock";

interface Props {
  stats: SessionStats;
}

export function SessionInfo({ stats }: Props) {
  const first = stats.firstActivity
    ? fmtClock(stats.firstActivity.hour, stats.firstActivity.minute)
    : "—";
  const last = stats.lastActivity
    ? fmtClock(stats.lastActivity.hour, stats.lastActivity.minute)
    : "—";

  return (
    <div className="session-info">
      <StatBlock label="First activity" value={first} className="si-item" />
      <StatBlock label="Last activity" value={last} className="si-item" />
      <StatBlock
        label="Longest session"
        value={fmtMinutesActive(stats.longestSessionMin)}
        sub={
          stats.longestSession
            ? `${fmtClock(stats.longestSession.startHour, stats.longestSession.startMinute)} – ${fmtClock(stats.longestSession.endHour, stats.longestSession.endMinute)}`
            : undefined
        }
        className="si-item"
      />
      <StatBlock
        label="Sessions"
        value={String(stats.sessions.length)}
        sub={
          stats.averageBreakMin > 0 ? `avg break ${stats.averageBreakMin}m` : undefined
        }
        className="si-item"
      />
      <StatBlock
        label="Longest break"
        value={
          stats.longestBreakMin > 0 ? fmtMinutesActive(stats.longestBreakMin) : "—"
        }
        className="si-item"
      />
    </div>
  );
}
