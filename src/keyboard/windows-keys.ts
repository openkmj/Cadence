// Windows Virtual-Key code → physical key id.
// Reference: WinUser.h VK_*
const map: Record<number, string> = {
  0x08: "backspace",
  0x09: "tab",
  0x0d: "enter",
  0x14: "caps",
  0x1b: "esc",
  0x20: "space",
  0x21: "pgup",
  0x22: "pgdn",
  0x23: "end",
  0x24: "home",
  0x25: "arrow-left",
  0x26: "arrow-up",
  0x27: "arrow-right",
  0x28: "arrow-down",
  0x2e: "del-fwd",
  0x5b: "cmd-l", // LWin
  0x5c: "cmd-r", // RWin
  0xa0: "shift-l",
  0xa1: "shift-r",
  0xa2: "ctrl-l",
  0xa3: "ctrl-r",
  0xa4: "alt-l",
  0xa5: "alt-r",
  0xba: "semicolon",
  0xbb: "equals",
  0xbc: "comma",
  0xbd: "minus",
  0xbe: "period",
  0xbf: "slash",
  0xc0: "grave",
  0xdb: "lbracket",
  0xdc: "backslash",
  0xdd: "rbracket",
  0xde: "quote",
};

// Generic Shift / Ctrl / Alt (when L/R isn't reported)
map[0x10] = "shift-l";
map[0x11] = "ctrl-l";
map[0x12] = "alt-l";

// Digits 0-9
for (let i = 0; i <= 9; i++) map[0x30 + i] = `digit-${i}`;
// Letters A-Z
for (let i = 0; i < 26; i++) {
  map[0x41 + i] = `key-${String.fromCharCode(97 + i)}`;
}
// F1-F12
for (let i = 1; i <= 12; i++) map[0x6f + i] = `f${i}`;

export const WINDOWS_KEYCODES: Record<number, string> = map;
