import { useMemo } from "react";
import { fmtNum, pct } from "../lib/format";
import { prettyKeyId } from "../keyboard/format";

interface Props {
  /** Pre-aggregated by physical key id (from `aggregateByKeyId`). */
  counts: Map<string, number>;
  limit?: number;
}

export function TopKeys({ counts, limit = 12 }: Props) {
  const { rows, total } = useMemo(() => {
    let total = 0;
    const entries: { id: string; count: number }[] = [];
    for (const [id, count] of counts) {
      total += count;
      entries.push({ id, count });
    }
    entries.sort((a, b) => b.count - a.count);
    return { rows: entries.slice(0, limit), total };
  }, [counts, limit]);

  const max = rows[0]?.count ?? 1;

  return (
    <ol className="top-keys">
      {rows.length === 0 && <li className="empty">No keys yet</li>}
      {rows.map((r, i) => (
        <li key={r.id} className="top-key-row">
          <span className="rk">{String(i + 1).padStart(2, "0")}</span>
          <span className="kbd">{prettyKeyId(r.id)}</span>
          <span className="track">
            <span className="fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="ct">{fmtNum(r.count)}</span>
          <span className="pc">{pct(r.count, total)}</span>
        </li>
      ))}
    </ol>
  );
}
