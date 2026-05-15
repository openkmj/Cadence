/**
 * Color palette — single source of truth shared between JS components and CSS.
 * CSS counterparts live in `src/App.css` :root variables; keep them in sync.
 */

export const PALETTE = {
  accent: "#5eead4",
  accentDim: "#1ab69b",
  blue: "#7aa2ff",
  violet: "#a78bfa",
  amber: "#fbbf24",
  pink: "#fb7185",
  hot: "#ff8e7a",
  green: "#34d399",
  red: "#f87171",
  muted: "#7d8593",
  dim: "#4a5060",
} as const;

export type PaletteKey = keyof typeof PALETTE;
