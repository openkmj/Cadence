import type { Platform } from "../lib/types";
import { MACOS_KEYCODES } from "./macos-keys";
import { WINDOWS_KEYCODES } from "./windows-keys";

export interface KeyDef {
  id: string;
  label: string;
  /** Width multiplier, 1u = standard key. */
  w?: number;
  /** Bigger label, e.g. function/modifier keys. Used for styling. */
  variant?: "special" | "modifier" | "function";
}

export type Row = KeyDef[];

const k = (id: string, label: string, w = 1, variant?: KeyDef["variant"]): KeyDef => ({
  id,
  label,
  w,
  variant,
});

export function getLayout(platform: Platform): Row[] {
  const isMac = platform === "macos";

  const cmd = isMac ? "⌘" : "Win";
  const opt = isMac ? "⌥" : "Alt";
  const ctrl = isMac ? "⌃" : "Ctrl";
  const ent = isMac ? "return" : "enter";

  // Mac order: Ctrl Opt Cmd … Cmd Opt
  // Win order: Ctrl Win Alt … Alt Win Ctrl
  const bottomRow: Row = isMac
    ? [
        k("fn", "fn", 1, "modifier"),
        k("ctrl-l", ctrl, 1, "modifier"),
        k("alt-l", opt, 1.25, "modifier"),
        k("cmd-l", cmd, 1.25, "modifier"),
        k("space", "space", 5),
        k("cmd-r", cmd, 1.25, "modifier"),
        k("alt-r", opt, 1.25, "modifier"),
        k("arrow-left", "◀", 1, "special"),
        k("arrow-up", "▲", 1, "special"),
        k("arrow-down", "▼", 1, "special"),
        k("arrow-right", "▶", 1, "special"),
      ]
    : [
        k("ctrl-l", ctrl, 1.25, "modifier"),
        k("cmd-l", cmd, 1.25, "modifier"),
        k("alt-l", "Alt", 1.25, "modifier"),
        k("space", "space", 6.25),
        k("alt-r", "Alt", 1.25, "modifier"),
        k("cmd-r", cmd, 1.25, "modifier"),
        k("fn", "Fn", 1.25, "modifier"),
        k("ctrl-r", "Ctrl", 1.25, "modifier"),
      ];

  return [
    [
      k("esc", "esc", 1, "function"),
      k("f1", "F1", 1, "function"),
      k("f2", "F2", 1, "function"),
      k("f3", "F3", 1, "function"),
      k("f4", "F4", 1, "function"),
      k("f5", "F5", 1, "function"),
      k("f6", "F6", 1, "function"),
      k("f7", "F7", 1, "function"),
      k("f8", "F8", 1, "function"),
      k("f9", "F9", 1, "function"),
      k("f10", "F10", 1, "function"),
      k("f11", "F11", 1, "function"),
      k("f12", "F12", 1, "function"),
    ],
    [
      k("grave", "`"),
      k("digit-1", "1"),
      k("digit-2", "2"),
      k("digit-3", "3"),
      k("digit-4", "4"),
      k("digit-5", "5"),
      k("digit-6", "6"),
      k("digit-7", "7"),
      k("digit-8", "8"),
      k("digit-9", "9"),
      k("digit-0", "0"),
      k("minus", "−"),
      k("equals", "="),
      k("backspace", "⌫", 2, "special"),
    ],
    [
      k("tab", "tab", 1.5, "special"),
      k("key-q", "Q"),
      k("key-w", "W"),
      k("key-e", "E"),
      k("key-r", "R"),
      k("key-t", "T"),
      k("key-y", "Y"),
      k("key-u", "U"),
      k("key-i", "I"),
      k("key-o", "O"),
      k("key-p", "P"),
      k("lbracket", "["),
      k("rbracket", "]"),
      k("backslash", "\\", 1.5),
    ],
    [
      k("caps", "caps", 1.75, "modifier"),
      k("key-a", "A"),
      k("key-s", "S"),
      k("key-d", "D"),
      k("key-f", "F"),
      k("key-g", "G"),
      k("key-h", "H"),
      k("key-j", "J"),
      k("key-k", "K"),
      k("key-l", "L"),
      k("semicolon", ";"),
      k("quote", "'"),
      k("enter", ent, 2.25, "special"),
    ],
    [
      k("shift-l", "⇧", 2.25, "modifier"),
      k("key-z", "Z"),
      k("key-x", "X"),
      k("key-c", "C"),
      k("key-v", "V"),
      k("key-b", "B"),
      k("key-n", "N"),
      k("key-m", "M"),
      k("comma", ","),
      k("period", "."),
      k("slash", "/"),
      k("shift-r", "⇧", 2.75, "modifier"),
    ],
    bottomRow,
  ];
}

export function keycodeToId(platform: Platform, code: number): string | null {
  if (platform === "macos") return MACOS_KEYCODES[code] ?? null;
  if (platform === "windows") return WINDOWS_KEYCODES[code] ?? null;
  return null;
}

/** Build a Map<key-id, count> from raw KeyCount[]. Aggregates left/right modifier
 *  variants so the heatmap shows the union if your typing uses both sides. */
export function aggregateByKeyId(
  platform: Platform,
  keys: { keycode: number; count: number }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const k of keys) {
    const id = keycodeToId(platform, k.keycode);
    if (!id) continue;
    m.set(id, (m.get(id) ?? 0) + k.count);
  }
  return m;
}
