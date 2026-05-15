import { useMemo, useState } from "react";
import { getLayout, type KeyDef, type Row } from "../keyboard/layout";
import type { Platform } from "../lib/types";
import { fmtCompact, fmtNum, pct } from "../lib/format";

const UNIT = 36;
const KEY_GAP = 4;
const ROW_GAP = 4;
const KEY_H = UNIT;

interface PositionedKey extends KeyDef {
  x: number;
  y: number;
  wpx: number;
}

function position(layout: Row[]): { keys: PositionedKey[]; width: number; height: number } {
  const keys: PositionedKey[] = [];
  let maxX = 0;
  layout.forEach((row, ri) => {
    let x = 0;
    const y = ri * (KEY_H + ROW_GAP);
    row.forEach((key) => {
      const wu = key.w ?? 1;
      const wpx = wu * UNIT - KEY_GAP;
      keys.push({ ...key, x, y, wpx });
      x += wu * UNIT;
    });
    maxX = Math.max(maxX, x);
  });
  return {
    keys,
    width: maxX - KEY_GAP,
    height: layout.length * (KEY_H + ROW_GAP) - ROW_GAP,
  };
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}
function hex(s: string) {
  const n = parseInt(s.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  return `rgb(${lerp(ar, br, t)},${lerp(ag, bg, t)},${lerp(ab, bb, t)})`;
}

// cold → warm gradient: panel → accent → hot
function colorFor(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "#171b24";
  const raw = count / max;
  const t = Math.pow(raw, 0.55); // gamma — make mid-range pop
  if (t < 0.55) return mix("#1c2230", "#5eead4", t / 0.55);
  return mix("#5eead4", "#fb7185", (t - 0.55) / 0.45);
}

interface Props {
  platform: Platform;
  counts: Map<string, number>;
  total: number;
}

export function KeyboardHeatmap({ platform, counts, total }: Props) {
  const layout = useMemo(() => getLayout(platform), [platform]);
  const placed = useMemo(() => position(layout), [layout]);

  const max = useMemo(() => {
    let m = 0;
    for (const v of counts.values()) m = Math.max(m, v);
    return m;
  }, [counts]);

  const [hover, setHover] = useState<{ x: number; y: number; key: PositionedKey } | null>(
    null,
  );

  const onEnter = (e: React.MouseEvent<SVGGElement>, key: PositionedKey) => {
    const bbox = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    setHover({
      x: key.x + key.wpx / 2,
      y: key.y,
      key,
    });
    void bbox;
  };
  const onLeave = () => setHover(null);

  return (
    <div className="kb-heatmap" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${placed.width} ${placed.height}`}
        width="100%"
        preserveAspectRatio="xMinYMin meet"
        style={{ display: "block" }}
      >
        {placed.keys.map((key) => {
          const count = counts.get(key.id) ?? 0;
          const fill = colorFor(count, max);
          const hot = count > 0 && count === max;
          const stroke = count > 0
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.04)";
          const labelColor =
            count > 0 && count / max > 0.35
              ? "rgba(20,23,32,0.78)"
              : "rgba(231,235,243,0.55)";

          return (
            <g
              key={key.id + "-" + key.x + "-" + key.y}
              onMouseEnter={(e) => onEnter(e, key)}
              onMouseLeave={onLeave}
              style={{ cursor: "default" }}
            >
              <rect
                x={key.x}
                y={key.y}
                width={key.wpx}
                height={KEY_H}
                rx={5}
                ry={5}
                fill={fill}
                stroke={stroke}
                strokeWidth={1}
              />
              {hot && (
                <rect
                  x={key.x + 0.5}
                  y={key.y + 0.5}
                  width={key.wpx - 1}
                  height={KEY_H - 1}
                  rx={5}
                  ry={5}
                  fill="none"
                  stroke="rgba(251,113,133,0.65)"
                  strokeWidth={1}
                />
              )}
              <text
                x={key.x + 6}
                y={key.y + 12}
                fontSize={9}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
                fill={labelColor}
              >
                {key.label}
              </text>
              {count > 0 && key.wpx >= 30 && (
                <text
                  x={key.x + key.wpx - 6}
                  y={key.y + KEY_H - 6}
                  fontSize={9}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fill={labelColor}
                  fontWeight={500}
                >
                  {fmtCompact(count)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="kb-tooltip"
          style={{
            position: "absolute",
            left: `${(hover.x / placed.width) * 100}%`,
            top: `calc(${(hover.y / placed.height) * 100}% - 8px)`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="kb-tt-id">{hover.key.id}</div>
          <div className="kb-tt-count">
            {fmtNum(counts.get(hover.key.id) ?? 0)}
            <span className="kb-tt-pct">
              {" "}
              {total > 0 ? pct(counts.get(hover.key.id) ?? 0, total) : "0%"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
