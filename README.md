# Cadence

Local-only desktop app (macOS + Windows) that records your keyboard and mouse usage in 1-minute buckets and renders three dense dashboards on top of it. All data lives in a single SQLite file on your machine — nothing leaves the network.

## What it tracks

Aggregated **per minute**. No raw keystrokes, no key names, no clipboard, no app/window context.

- **Keystrokes** — total count and **per-keycode** count
- **Mouse clicks** — left / right / middle / other
- **Scroll** events
- **Mouse travel** — Euclidean pixel distance

Data location:

- macOS:   `~/Library/Application Support/cadence/stats.sqlite`
- Windows: `%LOCALAPPDATA%\cadence\stats.sqlite`

## The three tabs

- **Today** — 6 KPI cards (with 7-day sparklines + delta vs weekly average), 24-hour activity chart with current-hour highlight, session pattern sidebar (first/last activity, longest session/break), click breakdown, last-60-minutes strip.
- **Keyboard** — physical-layout heatmap of every key on a 60% ANSI keyboard with color-saturation by press count. Range toggle: today / week / month / all. Plus category breakdown, correction rate, lines committed, modifier usage bars, row distribution, and top-12 keys list.
- **History** — week-over-week ribbon (this week / best day / streak / tracked days), 7×24 activity heatmap, weekday-rhythm bars, 30-day trend with 7-day moving average, last-14-days daily table.

## Stack

- **[Tauri 2](https://tauri.app/)** — Rust backend + WebView shell.
- **macOS** — direct `core-graphics` `CGEventTap`.
- **Windows** — `SetWindowsHookExW(WH_KEYBOARD_LL / WH_MOUSE_LL)`.
- **[rusqlite](https://crates.io/crates/rusqlite)** with WAL + `synchronous=NORMAL`.
- **React 19 + TypeScript + Vite** — UI.

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Produces `src-tauri/target/release/bundle/{macos,dmg,msi}/…`.

## Permissions

### macOS
First run prompts for **Accessibility** *and* **Input Monitoring**. If denied, grant manually:

- `System Settings → Privacy & Security → Accessibility` → enable the binary
- `System Settings → Privacy & Security → Input Monitoring` → enable the binary

Dev mode (`npm run tauri dev`) and the production `.app` register as different binaries — they need separate permission grants. Distribution outside the App Store requires code signing + notarization.

### Windows
Low-level keyboard / mouse hooks may be flagged by AV on unsigned binaries — sign for distribution.

## Privacy

- Only counts are stored. **No keys**, no key combinations, no clipboard, no window titles, no app names.
- No network calls.
- Inspect or wipe `stats.sqlite` at any time.
