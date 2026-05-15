use std::path::PathBuf;

use chrono::NaiveDate;
use rusqlite::{params, Connection};
use serde::Serialize;

use crate::aggregator::{Bucket, BucketKey};

const SCHEMA_VERSION: i32 = 1;

pub fn db_path() -> PathBuf {
    let mut p = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("cadence");
    std::fs::create_dir_all(&p).ok();
    p.push("stats.sqlite");
    p
}

/// Open the DB, set pragmas, and run any pending migrations.
/// Call this exactly once at app startup and share the connection.
pub fn open() -> rusqlite::Result<Connection> {
    let conn = Connection::open(db_path())?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let version: i32 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version >= SCHEMA_VERSION {
        return Ok(());
    }

    if version < 1 {
        // v1: minute-level schema. Drop the early-dev hourly schema if it exists.
        conn.execute_batch(
            "DROP TABLE IF EXISTS hourly_stats;
             DROP TABLE IF EXISTS key_counts;

             CREATE TABLE minute_stats (
                 date TEXT NOT NULL,
                 hour INTEGER NOT NULL,
                 minute INTEGER NOT NULL,
                 keystrokes INTEGER NOT NULL DEFAULT 0,
                 left_clicks INTEGER NOT NULL DEFAULT 0,
                 right_clicks INTEGER NOT NULL DEFAULT 0,
                 middle_clicks INTEGER NOT NULL DEFAULT 0,
                 other_clicks INTEGER NOT NULL DEFAULT 0,
                 scrolls INTEGER NOT NULL DEFAULT 0,
                 mouse_distance_px REAL NOT NULL DEFAULT 0,
                 PRIMARY KEY (date, hour, minute)
             );
             CREATE INDEX idx_minute_stats_date ON minute_stats(date);

             CREATE TABLE key_counts (
                 date TEXT NOT NULL,
                 hour INTEGER NOT NULL,
                 minute INTEGER NOT NULL,
                 keycode INTEGER NOT NULL,
                 count INTEGER NOT NULL DEFAULT 0,
                 PRIMARY KEY (date, hour, minute, keycode)
             );
             CREATE INDEX idx_key_counts_date ON key_counts(date);",
        )?;
    }

    conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;
    Ok(())
}

/// Flush a batch of sealed buckets in a single transaction.
pub fn flush_batch(
    conn: &mut Connection,
    batch: &[(BucketKey, Bucket)],
) -> rusqlite::Result<()> {
    if batch.is_empty() {
        return Ok(());
    }
    let tx = conn.transaction()?;
    {
        let mut stats_stmt = tx.prepare_cached(
            "INSERT INTO minute_stats (date, hour, minute, keystrokes, left_clicks, right_clicks, middle_clicks, other_clicks, scrolls, mouse_distance_px)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(date, hour, minute) DO UPDATE SET
                keystrokes        = keystrokes + excluded.keystrokes,
                left_clicks       = left_clicks + excluded.left_clicks,
                right_clicks      = right_clicks + excluded.right_clicks,
                middle_clicks     = middle_clicks + excluded.middle_clicks,
                other_clicks      = other_clicks + excluded.other_clicks,
                scrolls           = scrolls + excluded.scrolls,
                mouse_distance_px = mouse_distance_px + excluded.mouse_distance_px",
        )?;
        let mut keys_stmt = tx.prepare_cached(
            "INSERT INTO key_counts (date, hour, minute, keycode, count) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(date, hour, minute, keycode) DO UPDATE SET count = count + excluded.count",
        )?;

        for ((date, hour, minute), b) in batch {
            stats_stmt.execute(params![
                date.to_string(),
                hour,
                minute,
                b.keystrokes as i64,
                b.left_clicks as i64,
                b.right_clicks as i64,
                b.middle_clicks as i64,
                b.other_clicks as i64,
                b.scrolls as i64,
                b.mouse_distance_px,
            ])?;
            for (&keycode, &count) in &b.key_counts {
                keys_stmt.execute(params![
                    date.to_string(),
                    hour,
                    minute,
                    keycode as i64,
                    count as i64,
                ])?;
            }
        }
    }
    tx.commit()?;
    Ok(())
}

#[derive(Serialize, Clone, Debug)]
pub struct HourlyStat {
    pub date: String,
    pub hour: u32,
    pub keystrokes: i64,
    pub left_clicks: i64,
    pub right_clicks: i64,
    pub middle_clicks: i64,
    pub other_clicks: i64,
    pub scrolls: i64,
    pub mouse_distance_px: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct DailyStat {
    pub date: String,
    pub keystrokes: i64,
    pub clicks: i64,
    pub scrolls: i64,
    pub mouse_distance_px: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct KeyCount {
    pub keycode: u16,
    pub count: i64,
}

#[derive(Serialize, Clone, Debug)]
pub struct MinuteStat {
    pub date: String,
    pub hour: u32,
    pub minute: u32,
    pub keystrokes: i64,
    pub clicks: i64,
    pub scrolls: i64,
    pub mouse_distance_px: f64,
}

pub fn hourly_for_date(conn: &Connection, date: NaiveDate) -> rusqlite::Result<Vec<HourlyStat>> {
    let mut stmt = conn.prepare_cached(
        "SELECT date, hour,
            SUM(keystrokes), SUM(left_clicks), SUM(right_clicks), SUM(middle_clicks),
            SUM(other_clicks), SUM(scrolls), SUM(mouse_distance_px)
         FROM minute_stats WHERE date = ?1
         GROUP BY date, hour ORDER BY hour",
    )?;
    let rows = stmt.query_map(params![date.to_string()], |r| {
        Ok(HourlyStat {
            date: r.get(0)?,
            hour: r.get::<_, i64>(1)? as u32,
            keystrokes: r.get::<_, Option<i64>>(2)?.unwrap_or(0),
            left_clicks: r.get::<_, Option<i64>>(3)?.unwrap_or(0),
            right_clicks: r.get::<_, Option<i64>>(4)?.unwrap_or(0),
            middle_clicks: r.get::<_, Option<i64>>(5)?.unwrap_or(0),
            other_clicks: r.get::<_, Option<i64>>(6)?.unwrap_or(0),
            scrolls: r.get::<_, Option<i64>>(7)?.unwrap_or(0),
            mouse_distance_px: r.get::<_, Option<f64>>(8)?.unwrap_or(0.0),
        })
    })?;
    rows.collect()
}

pub fn daily(conn: &Connection, days: u32) -> rusqlite::Result<Vec<DailyStat>> {
    let mut stmt = conn.prepare_cached(
        "SELECT date,
            SUM(keystrokes),
            SUM(left_clicks + right_clicks + middle_clicks + other_clicks),
            SUM(scrolls),
            SUM(mouse_distance_px)
         FROM minute_stats
         GROUP BY date
         ORDER BY date DESC
         LIMIT ?1",
    )?;
    let rows = stmt.query_map(params![days as i64], |r| {
        Ok(DailyStat {
            date: r.get(0)?,
            keystrokes: r.get::<_, Option<i64>>(1)?.unwrap_or(0),
            clicks: r.get::<_, Option<i64>>(2)?.unwrap_or(0),
            scrolls: r.get::<_, Option<i64>>(3)?.unwrap_or(0),
            mouse_distance_px: r.get::<_, Option<f64>>(4)?.unwrap_or(0.0),
        })
    })?;
    rows.collect()
}

pub fn top_keys_for_date(
    conn: &Connection,
    date: NaiveDate,
    limit: u32,
) -> rusqlite::Result<Vec<KeyCount>> {
    let mut stmt = conn.prepare_cached(
        "SELECT keycode, SUM(count) as total
         FROM key_counts WHERE date = ?1
         GROUP BY keycode ORDER BY total DESC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![date.to_string(), limit as i64], |r| {
        Ok(KeyCount {
            keycode: r.get::<_, i64>(0)? as u16,
            count: r.get(1)?,
        })
    })?;
    rows.collect()
}

/// Per-keycode totals across the last N days. `days = 0` means all-time.
pub fn keys_last_n_days(conn: &Connection, days: u32) -> rusqlite::Result<Vec<KeyCount>> {
    let sql = if days == 0 {
        "SELECT keycode, SUM(count) as total
         FROM key_counts
         GROUP BY keycode ORDER BY total DESC"
            .to_string()
    } else {
        format!(
            "SELECT keycode, SUM(count) as total
             FROM key_counts
             WHERE date >= date('now', 'localtime', '-{} day')
             GROUP BY keycode ORDER BY total DESC",
            days.saturating_sub(1)
        )
    };
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |r| {
        Ok(KeyCount {
            keycode: r.get::<_, i64>(0)? as u16,
            count: r.get(1)?,
        })
    })?;
    rows.collect()
}

/// Last `limit` minute rows for today, newest first.
pub fn recent_minutes(
    conn: &Connection,
    date: NaiveDate,
    limit: u32,
) -> rusqlite::Result<Vec<MinuteStat>> {
    let mut stmt = conn.prepare_cached(
        "SELECT date, hour, minute, keystrokes,
            (left_clicks + right_clicks + middle_clicks + other_clicks) AS clicks,
            scrolls, mouse_distance_px
         FROM minute_stats WHERE date = ?1
         ORDER BY hour DESC, minute DESC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![date.to_string(), limit as i64], |r| {
        Ok(MinuteStat {
            date: r.get(0)?,
            hour: r.get::<_, i64>(1)? as u32,
            minute: r.get::<_, i64>(2)? as u32,
            keystrokes: r.get(3)?,
            clicks: r.get(4)?,
            scrolls: r.get(5)?,
            mouse_distance_px: r.get(6)?,
        })
    })?;
    rows.collect()
}

/// Hourly buckets for the last N days, oldest first.
pub fn last_n_days_hourly(conn: &Connection, days: u32) -> rusqlite::Result<Vec<HourlyStat>> {
    let sql = format!(
        "SELECT date, hour,
            SUM(keystrokes), SUM(left_clicks), SUM(right_clicks), SUM(middle_clicks),
            SUM(other_clicks), SUM(scrolls), SUM(mouse_distance_px)
         FROM minute_stats
         WHERE date >= date('now', 'localtime', '-{} day')
         GROUP BY date, hour
         ORDER BY date, hour",
        days.saturating_sub(1)
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |r| {
        Ok(HourlyStat {
            date: r.get(0)?,
            hour: r.get::<_, i64>(1)? as u32,
            keystrokes: r.get::<_, Option<i64>>(2)?.unwrap_or(0),
            left_clicks: r.get::<_, Option<i64>>(3)?.unwrap_or(0),
            right_clicks: r.get::<_, Option<i64>>(4)?.unwrap_or(0),
            middle_clicks: r.get::<_, Option<i64>>(5)?.unwrap_or(0),
            other_clicks: r.get::<_, Option<i64>>(6)?.unwrap_or(0),
            scrolls: r.get::<_, Option<i64>>(7)?.unwrap_or(0),
            mouse_distance_px: r.get::<_, Option<f64>>(8)?.unwrap_or(0.0),
        })
    })?;
    rows.collect()
}

/// Count minutes today where at least one event occurred.
pub fn active_minutes(conn: &Connection, date: NaiveDate) -> rusqlite::Result<i64> {
    conn.query_row(
        "SELECT COUNT(*) FROM minute_stats
         WHERE date = ?1 AND
               (keystrokes + left_clicks + right_clicks + middle_clicks + other_clicks + scrolls) > 0",
        params![date.to_string()],
        |r| r.get(0),
    )
}

#[derive(Serialize, Clone, Debug)]
pub struct DbInfo {
    pub size_bytes: i64,
    pub minute_rows: i64,
    pub key_rows: i64,
    pub schema_version: i32,
}

pub fn db_info(conn: &Connection) -> rusqlite::Result<DbInfo> {
    let page_count: i64 = conn.query_row("PRAGMA page_count", [], |r| r.get(0))?;
    let page_size: i64 = conn.query_row("PRAGMA page_size", [], |r| r.get(0))?;
    let minute_rows: i64 = conn.query_row("SELECT COUNT(*) FROM minute_stats", [], |r| r.get(0))?;
    let key_rows: i64 = conn.query_row("SELECT COUNT(*) FROM key_counts", [], |r| r.get(0))?;
    let schema_version: i32 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    Ok(DbInfo {
        size_bytes: page_count * page_size,
        minute_rows,
        key_rows,
        schema_version,
    })
}
