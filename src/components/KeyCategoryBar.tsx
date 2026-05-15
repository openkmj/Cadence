import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type Category,
} from "../keyboard/categories";
import { fmtCompact, pct } from "../lib/format";

interface Props {
  byCategory: Map<Category, number>;
  total: number;
}

export function KeyCategoryBar({ byCategory, total }: Props) {
  const segments = CATEGORY_ORDER.map((cat) => ({
    cat,
    count: byCategory.get(cat) ?? 0,
  })).filter((s) => s.count > 0);

  if (total === 0 || segments.length === 0) {
    return <div className="cat-empty">No keys yet</div>;
  }

  return (
    <div className="cat-bar">
      <div className="cat-stack">
        {segments.map((s) => (
          <div
            key={s.cat}
            className="cat-seg"
            style={{
              flex: s.count,
              background: CATEGORY_COLOR[s.cat],
            }}
            title={`${CATEGORY_LABEL[s.cat]} — ${fmtCompact(s.count)} (${pct(s.count, total)})`}
          />
        ))}
      </div>
      <div className="cat-legend">
        {segments.map((s) => (
          <div key={s.cat} className="cat-legend-item">
            <span
              className="cat-swatch"
              style={{ background: CATEGORY_COLOR[s.cat] }}
            />
            <span className="cat-lbl">{CATEGORY_LABEL[s.cat]}</span>
            <span className="cat-pct">{pct(s.count, total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
