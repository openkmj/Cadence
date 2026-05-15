import { ROW_LABEL, type KeyboardAnalytics } from "../keyboard/categories";
import { fmtCompact, fmtNum, pct } from "../lib/format";
import { PALETTE } from "../lib/palette";

const CORRECTION_GOOD_THRESHOLD = 0.04;
const CORRECTION_OK_THRESHOLD = 0.08;

type Tone = "good" | "ok" | "warn";

function correctionTone(rate: number): Tone {
  if (rate < CORRECTION_GOOD_THRESHOLD) return "good";
  if (rate < CORRECTION_OK_THRESHOLD) return "ok";
  return "warn";
}

interface Props {
  analytics: KeyboardAnalytics;
}

export function KeyboardStats({ analytics }: Props) {
  const { total, modifiers, editing, correctionRate, byRow } = analytics;
  const tone = correctionTone(correctionRate);

  const modifierEntries: { k: string; v: number; c: string }[] = [
    { k: "Shift", v: modifiers.shift, c: PALETTE.accent },
    { k: "Cmd",   v: modifiers.cmd,   c: PALETTE.blue },
    { k: "Ctrl",  v: modifiers.ctrl,  c: PALETTE.violet },
    { k: "Alt",   v: modifiers.alt,   c: PALETTE.amber },
    { k: "Fn",    v: modifiers.fn,    c: PALETTE.muted },
    { k: "Caps",  v: modifiers.caps,  c: PALETTE.red },
  ];
  const modMax = Math.max(1, ...modifierEntries.map((m) => m.v));

  const rows: { k: string; v: number }[] = (
    ["row-function", "row-number", "row-top", "row-home", "row-bottom", "row-thumb"] as const
  ).map((r) => ({ k: ROW_LABEL[r], v: byRow.get(r) ?? 0 }));
  const rowMax = Math.max(1, ...rows.map((r) => r.v));

  return (
    <div className="kb-stats">
      <div className="kb-stats-hero">
        <div className={"hero-stat tone-" + tone}>
          <div className="hs-k">Correction rate</div>
          <div className="hs-v">{(correctionRate * 100).toFixed(1)}%</div>
          <div className="hs-sub">
            {fmtCompact(editing.backspace + editing.delFwd)} / {fmtCompact(total)}
          </div>
        </div>
        <div className="hero-stat">
          <div className="hs-k">Lines committed</div>
          <div className="hs-v">{fmtNum(editing.enter)}</div>
          <div className="hs-sub">{pct(editing.enter, total)} of keys</div>
        </div>
      </div>

      <BarList label="Modifiers" entries={modifierEntries} max={modMax} />
      <BarList
        label="Row distribution"
        entries={rows.map((r) => ({ k: r.k, v: r.v, c: PALETTE.accent }))}
        max={rowMax}
      />
    </div>
  );
}

function BarList({
  label,
  entries,
  max,
}: {
  label: string;
  entries: { k: string; v: number; c: string }[];
  max: number;
}) {
  return (
    <div className="kb-stats-block">
      <div className="ksb-label">{label}</div>
      <div className="mod-list">
        {entries.map((e) => (
          <div key={e.k} className="mod-row">
            <span className="mod-k">{e.k}</span>
            <span className="mod-track">
              <span
                className="mod-fill"
                style={{ width: `${(e.v / max) * 100}%`, background: e.c }}
              />
            </span>
            <span className="mod-v">{fmtCompact(e.v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
