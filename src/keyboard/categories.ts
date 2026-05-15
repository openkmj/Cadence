/**
 * Classify physical key ids into semantic categories and physical rows.
 * Used by the Keyboard tab analytics panels.
 */

export type Category =
  | "letters"
  | "digits"
  | "space"
  | "editing"
  | "punctuation"
  | "modifiers"
  | "navigation"
  | "function";

export const CATEGORY_LABEL: Record<Category, string> = {
  letters: "Letters",
  digits: "Digits",
  space: "Space",
  editing: "Editing",
  punctuation: "Punct.",
  modifiers: "Modifiers",
  navigation: "Nav.",
  function: "Function",
};

export const CATEGORY_COLOR: Record<Category, string> = {
  letters: "#5eead4",
  space: "#7fdfd0",
  digits: "#7aa2ff",
  punctuation: "#a78bfa",
  editing: "#fbbf24",
  modifiers: "#fb7185",
  navigation: "#34d399",
  function: "#94a3b8",
};

export const CATEGORY_ORDER: Category[] = [
  "letters",
  "space",
  "digits",
  "punctuation",
  "editing",
  "modifiers",
  "navigation",
  "function",
];

export function categoryOf(id: string): Category {
  if (id.startsWith("key-")) return "letters";
  if (id.startsWith("digit-")) return "digits";
  if (id === "space") return "space";
  if (id === "backspace" || id === "enter" || id === "del-fwd" || id === "tab")
    return "editing";
  if (
    [
      "grave",
      "minus",
      "equals",
      "lbracket",
      "rbracket",
      "backslash",
      "semicolon",
      "quote",
      "comma",
      "period",
      "slash",
    ].includes(id)
  ) {
    return "punctuation";
  }
  if (
    id.startsWith("shift") ||
    id.startsWith("ctrl") ||
    id.startsWith("alt") ||
    id.startsWith("cmd") ||
    id === "fn" ||
    id === "caps"
  ) {
    return "modifiers";
  }
  if (
    id.startsWith("arrow-") ||
    id === "home" ||
    id === "end" ||
    id === "pgup" ||
    id === "pgdn"
  ) {
    return "navigation";
  }
  if (/^f\d+$/.test(id) || id === "esc") return "function";
  return "punctuation";
}

// Physical row classification (independent of category — captures finger travel patterns).
export type RowGroup =
  | "row-function"
  | "row-number"
  | "row-top"
  | "row-home"
  | "row-bottom"
  | "row-thumb";

export const ROW_LABEL: Record<RowGroup, string> = {
  "row-function": "Function",
  "row-number": "Number",
  "row-top": "Top",
  "row-home": "Home",
  "row-bottom": "Bottom",
  "row-thumb": "Thumb / mod",
};

const ROW_NUMBER = new Set([
  "grave",
  "digit-1",
  "digit-2",
  "digit-3",
  "digit-4",
  "digit-5",
  "digit-6",
  "digit-7",
  "digit-8",
  "digit-9",
  "digit-0",
  "minus",
  "equals",
  "backspace",
]);
const ROW_TOP = new Set([
  "tab",
  "key-q",
  "key-w",
  "key-e",
  "key-r",
  "key-t",
  "key-y",
  "key-u",
  "key-i",
  "key-o",
  "key-p",
  "lbracket",
  "rbracket",
  "backslash",
]);
const ROW_HOME = new Set([
  "caps",
  "key-a",
  "key-s",
  "key-d",
  "key-f",
  "key-g",
  "key-h",
  "key-j",
  "key-k",
  "key-l",
  "semicolon",
  "quote",
  "enter",
]);
const ROW_BOTTOM = new Set([
  "shift-l",
  "shift-r",
  "key-z",
  "key-x",
  "key-c",
  "key-v",
  "key-b",
  "key-n",
  "key-m",
  "comma",
  "period",
  "slash",
]);
const ROW_THUMB = new Set([
  "ctrl-l",
  "ctrl-r",
  "alt-l",
  "alt-r",
  "cmd-l",
  "cmd-r",
  "fn",
  "space",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-down",
]);

export function rowOf(id: string): RowGroup {
  if (id === "esc" || /^f\d+$/.test(id)) return "row-function";
  if (ROW_NUMBER.has(id)) return "row-number";
  if (ROW_TOP.has(id)) return "row-top";
  if (ROW_HOME.has(id)) return "row-home";
  if (ROW_BOTTOM.has(id)) return "row-bottom";
  if (ROW_THUMB.has(id)) return "row-thumb";
  return "row-home";
}

export interface KeyboardAnalytics {
  total: number;
  distinct: number;
  byCategory: Map<Category, number>;
  byRow: Map<RowGroup, number>;
  modifiers: { shift: number; ctrl: number; alt: number; cmd: number; fn: number; caps: number };
  editing: { backspace: number; enter: number; delFwd: number; tab: number };
  correctionRate: number; // (backspace + delFwd) / total keystrokes
}

export function analyzeKeyboard(counts: Map<string, number>): KeyboardAnalytics {
  let total = 0;
  let distinct = 0;
  const byCategory = new Map<Category, number>();
  const byRow = new Map<RowGroup, number>();
  const modifiers = { shift: 0, ctrl: 0, alt: 0, cmd: 0, fn: 0, caps: 0 };
  const editing = { backspace: 0, enter: 0, delFwd: 0, tab: 0 };

  for (const [id, count] of counts) {
    if (count <= 0) continue;
    total += count;
    distinct += 1;
    const cat = categoryOf(id);
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + count);
    const row = rowOf(id);
    byRow.set(row, (byRow.get(row) ?? 0) + count);

    if (id.startsWith("shift")) modifiers.shift += count;
    else if (id.startsWith("ctrl")) modifiers.ctrl += count;
    else if (id.startsWith("alt")) modifiers.alt += count;
    else if (id.startsWith("cmd")) modifiers.cmd += count;
    else if (id === "fn") modifiers.fn += count;
    else if (id === "caps") modifiers.caps += count;

    if (id === "backspace") editing.backspace += count;
    else if (id === "enter") editing.enter += count;
    else if (id === "del-fwd") editing.delFwd += count;
    else if (id === "tab") editing.tab += count;
  }

  const correctionRate = total === 0 ? 0 : (editing.backspace + editing.delFwd) / total;

  return { total, distinct, byCategory, byRow, modifiers, editing, correctionRate };
}
