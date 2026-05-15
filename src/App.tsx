import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./lib/api";
import type {
  AppMeta,
  DailyStat,
  DbInfo,
  HourlyStat,
  KeyCount,
  MinuteStat,
  Range,
  TodaySummary,
} from "./lib/types";
import { aggregateByKeyId } from "./keyboard/layout";
import { analyzeKeyboard } from "./keyboard/categories";
import { prettyKeyId } from "./keyboard/format";
import { detectSessions } from "./lib/session";
import { summarizeHistory } from "./lib/history";
import {
  estimateWpm,
  fmtCompact,
  fmtDistance,
  fmtMinutesActive,
  fmtNum,
} from "./lib/format";

import { Header } from "./components/Header";
import { KpiCard } from "./components/KpiCard";
import { HourChart } from "./components/HourChart";
import { KeyboardHeatmap } from "./components/KeyboardHeatmap";
import { TopKeys } from "./components/TopKeys";
import { ClickBreakdown } from "./components/ClickBreakdown";
import { MinuteStrip } from "./components/MinuteStrip";
import { WeekHeatmap } from "./components/WeekHeatmap";
import { DailyTable } from "./components/DailyTable";
import { StatusBar } from "./components/StatusBar";
import { KeyCategoryBar } from "./components/KeyCategoryBar";
import { KeyboardStats } from "./components/KeyboardStats";
import { SessionInfo } from "./components/SessionInfo";
import { WoWRibbon } from "./components/WoWRibbon";
import { WeekdayBars } from "./components/WeekdayBars";
import { TrendChart } from "./components/TrendChart";
import { StatBlock } from "./components/StatBlock";
import "./App.css";

type TabKey = "today" | "keyboard" | "history";

const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 30000;

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "keyboard", label: "Keyboard" },
  { key: "history", label: "History" },
];

export default function App() {
  const [tab, setTab] = useState<TabKey>("today");
  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [keysRange, setKeysRange] = useState<Range>("today");
  const [keysForRange, setKeysForRange] = useState<KeyCount[]>([]);
  const [recentMinutes, setRecentMinutes] = useState<MinuteStat[]>([]);
  const [weekHourly, setWeekHourly] = useState<HourlyStat[]>([]);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFlushAgo, setLastFlushAgo] = useState<number | null>(null);

  const lastFastFetchAt = useRef<number>(0);
  const todayKeysTick = useRef(0);

  const fastFetch = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([api.today(), api.recentMinutes(1440)]);
      setToday(t);
      setRecentMinutes(m);
      lastFastFetchAt.current = Date.now();
      setError(null);
      // Live re-fetch of "today" keys only when the keyboard panel is showing that range.
      todayKeysTick.current++;
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const slowFetch = useCallback(async () => {
    try {
      const [d, w, info] = await Promise.all([
        api.daily(30),
        api.weekHourly(),
        api.dbInfo(),
      ]);
      setDaily(d);
      setWeekHourly(w);
      setDbInfo(info);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setError(String(e)));
    fastFetch();
    slowFetch();
    const fastId = setInterval(fastFetch, FAST_POLL_MS);
    const slowId = setInterval(slowFetch, SLOW_POLL_MS);
    return () => {
      clearInterval(fastId);
      clearInterval(slowId);
    };
  }, [fastFetch, slowFetch]);

  // Range-aware key fetch. Re-fetch on range change or — for the "today" range —
  // every fast poll. Other ranges aggregate days that cannot change in 3s.
  useEffect(() => {
    let cancelled = false;
    api
      .keys(keysRange)
      .then((k) => {
        if (!cancelled) setKeysForRange(k);
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [keysRange, keysRange === "today" ? todayKeysTick.current : 0]);

  useEffect(() => {
    const id = setInterval(() => {
      if (lastFastFetchAt.current === 0) return;
      setLastFlushAgo(Math.floor((Date.now() - lastFastFetchAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // === derived ===
  const totalClicks =
    (today?.left_clicks ?? 0) +
    (today?.right_clicks ?? 0) +
    (today?.middle_clicks ?? 0) +
    (today?.other_clicks ?? 0);

  const historySummary = useMemo(() => summarizeHistory(daily), [daily]);

  const deltaKeysPct = useMemo(() => {
    const lastWeekAvg =
      historySummary.lastWeekKeys > 0 ? historySummary.lastWeekKeys / 7 : null;
    if (lastWeekAvg == null || !today) return null;
    return ((today.keystrokes - lastWeekAvg) / lastWeekAvg) * 100;
  }, [historySummary, today]);

  const sparkKeys = useMemo(
    () => daily.slice(0, 7).map((d) => d.keystrokes).reverse(),
    [daily],
  );
  const sparkClicks = useMemo(
    () => daily.slice(0, 7).map((d) => d.clicks).reverse(),
    [daily],
  );
  const sparkScrolls = useMemo(
    () => daily.slice(0, 7).map((d) => d.scrolls).reverse(),
    [daily],
  );
  const sparkDist = useMemo(
    () => daily.slice(0, 7).map((d) => d.mouse_distance_px).reverse(),
    [daily],
  );

  const wpm = today ? estimateWpm(today.peak_minute_keys) : 0;

  const peakHour = useMemo(() => {
    if (!today) return null;
    let best = -1;
    let bestV = 0;
    for (const h of today.by_hour) {
      if (h.keystrokes > bestV) {
        bestV = h.keystrokes;
        best = h.hour;
      }
    }
    return best >= 0 ? best : null;
  }, [today]);

  const sessionStats = useMemo(() => detectSessions(recentMinutes), [recentMinutes]);

  const keyboardCounts = useMemo(
    () =>
      meta ? aggregateByKeyId(meta.platform, keysForRange) : new Map<string, number>(),
    [meta, keysForRange],
  );
  const keyboardAnalytics = useMemo(
    () => analyzeKeyboard(keyboardCounts),
    [keyboardCounts],
  );
  const topKey = useMemo(() => {
    let best: { id: string; count: number } | null = null;
    for (const [id, count] of keyboardCounts) {
      if (!best || count > best.count) best = { id, count };
    }
    return best;
  }, [keyboardCounts]);

  // === render ===
  return (
    <div className="app">
      <Header
        startedAtUnix={meta?.started_at_unix ?? Math.floor(Date.now() / 1000)}
        platform={meta?.platform ?? "—"}
      />

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={"tab" + (tab === t.key ? " on" : "")}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && <div className="banner-error">⚠ {error}</div>}

      {tab === "today" && (
        <main className="view tab-today">
          <section className="kpi-row">
            <KpiCard
              label="Keystrokes"
              value={fmtNum(today?.keystrokes ?? 0)}
              sub={
                deltaKeysPct != null
                  ? `${deltaKeysPct >= 0 ? "▲" : "▼"} ${Math.abs(deltaKeysPct).toFixed(0)}% vs daily avg`
                  : "—"
              }
              spark={sparkKeys}
              accent="teal"
            />
            <KpiCard
              label="Clicks"
              value={fmtNum(totalClicks)}
              sub={`L ${fmtNum(today?.left_clicks ?? 0)} · R ${fmtNum(today?.right_clicks ?? 0)} · M ${fmtNum(today?.middle_clicks ?? 0)}`}
              spark={sparkClicks}
              accent="blue"
            />
            <KpiCard
              label="Scrolls"
              value={fmtNum(today?.scrolls ?? 0)}
              sub={
                today && today.active_minutes > 0
                  ? `${(today.scrolls / today.active_minutes).toFixed(1)} / active min`
                  : "—"
              }
              spark={sparkScrolls}
              accent="amber"
            />
            <KpiCard
              label="Mouse travel"
              value={fmtDistance(today?.mouse_distance_px ?? 0)}
              sub={`${fmtCompact(today?.mouse_distance_px ?? 0)} px`}
              spark={sparkDist}
              accent="violet"
            />
            <KpiCard
              label="Active"
              value={fmtMinutesActive(today?.active_minutes ?? 0)}
              sub={
                sessionStats.sessions.length > 0
                  ? `${sessionStats.sessions.length} sessions`
                  : "no activity yet"
              }
              accent="pink"
            />
            <KpiCard
              label="Peak / WPM"
              value={fmtNum(today?.peak_minute_keys ?? 0)}
              sub={
                today?.peak_minute
                  ? `at ${String(today.peak_minute[0]).padStart(2, "0")}:${String(today.peak_minute[1]).padStart(2, "0")} · ≈ ${wpm} WPM`
                  : "—"
              }
              accent="teal"
            />
          </section>

          <section className="panel hour-panel">
            <div className="panel-head">
              <h2>
                Keystrokes by hour{" "}
                <span className="dim">— today, midnight → midnight</span>
              </h2>
            </div>
            <HourChart byHour={today?.by_hour ?? []} peakHour={peakHour} />
          </section>

          <section className="panel session-panel">
            <div className="panel-head">
              <h2>
                Session pattern <span className="dim">— idle gap ≥ 3 min</span>
              </h2>
            </div>
            <SessionInfo stats={sessionStats} />
          </section>

          <section className="panel click-panel">
            <div className="panel-head">
              <h2>Click breakdown</h2>
            </div>
            <ClickBreakdown
              left={today?.left_clicks ?? 0}
              right={today?.right_clicks ?? 0}
              middle={today?.middle_clicks ?? 0}
              other={today?.other_clicks ?? 0}
              scrolls={today?.scrolls ?? 0}
            />
          </section>

          <section className="panel strip-panel">
            <div className="panel-head">
              <h2>
                Last 60 minutes <span className="dim">— keystrokes / min</span>
              </h2>
            </div>
            <MinuteStrip minutes={recentMinutes} window={60} />
          </section>
        </main>
      )}

      {tab === "keyboard" && (
        <main className="view tab-keyboard">
          <section className="panel kb-summary-panel">
            <div className="kb-summary">
              <StatBlock
                label="Total"
                value={fmtNum(keyboardAnalytics.total)}
                sub={keysRange}
                size="sm"
                className="summary-stat"
              />
              <StatBlock
                label="Distinct keys"
                value={fmtNum(keyboardAnalytics.distinct)}
                sub="pressed"
                size="sm"
                className="summary-stat"
              />
              <StatBlock
                label="Most pressed"
                value={topKey ? prettyKeyId(topKey.id) : "—"}
                sub={topKey ? fmtNum(topKey.count) + " ×" : ""}
                size="sm"
                className="summary-stat"
              />
              <div className="kb-summary-spacer" />
              <div className="seg">
                {(["today", "week", "month", "all"] as Range[]).map((r) => (
                  <button
                    key={r}
                    className={"seg-btn" + (keysRange === r ? " on" : "")}
                    onClick={() => setKeysRange(r)}
                    type="button"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel keyboard-panel">
            <div className="panel-head">
              <h2>
                Keyboard heatmap{" "}
                <span className="dim">— hover any key for count</span>
              </h2>
            </div>
            {meta && (
              <KeyboardHeatmap
                platform={meta.platform}
                counts={keyboardCounts}
                total={keyboardAnalytics.total}
              />
            )}
          </section>

          <section className="panel category-panel">
            <div className="panel-head">
              <h2>
                Key categories{" "}
                <span className="dim">— of {fmtCompact(keyboardAnalytics.total)} key-downs</span>
              </h2>
            </div>
            <KeyCategoryBar
              byCategory={keyboardAnalytics.byCategory}
              total={keyboardAnalytics.total}
            />
          </section>

          <section className="panel kb-stats-panel">
            <div className="panel-head">
              <h2>Modifiers · Editing · Rows</h2>
            </div>
            <KeyboardStats analytics={keyboardAnalytics} />
          </section>

          <section className="panel top-keys-panel">
            <div className="panel-head">
              <h2>
                Top keys <span className="dim">— {keysRange}</span>
              </h2>
            </div>
            <TopKeys counts={keyboardCounts} limit={12} />
          </section>
        </main>
      )}

      {tab === "history" && (
        <main className="view tab-history">
          <section className="wow-panel">
            <WoWRibbon summary={historySummary} />
          </section>

          <section className="panel week-panel">
            <div className="panel-head">
              <h2>
                Activity heatmap{" "}
                <span className="dim">— 7d × 24h · today highlighted</span>
              </h2>
            </div>
            <WeekHeatmap hourly={weekHourly} />
          </section>

          <section className="panel weekday-panel">
            <div className="panel-head">
              <h2>
                Weekday rhythm <span className="dim">— avg keystrokes</span>
              </h2>
            </div>
            <WeekdayBars weekdayAverages={historySummary.weekdayAverages} />
          </section>

          <section className="panel trend-panel">
            <div className="panel-head">
              <h2>
                30-day trend <span className="dim">— daily keystrokes + 7d MA</span>
              </h2>
            </div>
            <TrendChart daily={daily} />
          </section>

          <section className="panel daily-panel">
            <div className="panel-head">
              <h2>
                Daily totals <span className="dim">— 14d</span>
              </h2>
            </div>
            <DailyTable rows={daily.slice(0, 14)} />
          </section>
        </main>
      )}

      <StatusBar db={dbInfo} dbPath={meta?.db_path} lastFlushAgo={lastFlushAgo} />
    </div>
  );
}
