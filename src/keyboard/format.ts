/**
 * Single source of truth for turning a physical key id into a human-readable label.
 * Used by TopKeys list and any "most pressed" highlight in the UI.
 */

const FRIENDLY: Record<string, string> = {
  space: "Space",
  enter: "↵ Return",
  backspace: "⌫ Backspace",
  tab: "Tab",
  esc: "Esc",
  "shift-l": "⇧ Shift",
  "shift-r": "⇧ Shift",
  "ctrl-l": "⌃ Ctrl",
  "ctrl-r": "⌃ Ctrl",
  "alt-l": "⌥ Alt",
  "alt-r": "⌥ Alt",
  "cmd-l": "⌘ Cmd",
  "cmd-r": "⌘ Cmd",
  caps: "Caps",
  fn: "Fn",
  "arrow-left": "←",
  "arrow-right": "→",
  "arrow-up": "↑",
  "arrow-down": "↓",
  grave: "`",
  minus: "−",
  equals: "=",
  lbracket: "[",
  rbracket: "]",
  backslash: "\\",
  semicolon: ";",
  quote: "'",
  comma: ",",
  period: ".",
  slash: "/",
  "del-fwd": "⌦ Del",
  pgup: "PgUp",
  pgdn: "PgDn",
  home: "Home",
  end: "End",
};

export function prettyKeyId(id: string | null, keycode?: number): string {
  if (!id) return keycode != null ? `0x${keycode.toString(16).padStart(2, "0")}` : "?";
  if (FRIENDLY[id]) return FRIENDLY[id];
  if (id.startsWith("key-")) return id.slice(4).toUpperCase();
  if (id.startsWith("digit-")) return id.slice(6);
  if (/^f\d+$/.test(id)) return id.toUpperCase();
  return id;
}
