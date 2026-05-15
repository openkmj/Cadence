mod aggregator;
mod input;
mod storage;

#[cfg(target_os = "macos")]
mod input_macos;
#[cfg(target_os = "windows")]
mod input_windows;

use std::sync::Arc;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use chrono::Local;
use parking_lot::Mutex;
use rusqlite::Connection;
use serde::Serialize;

use aggregator::Aggregator;
use storage::{DailyStat, DbInfo, HourlyStat, KeyCount, MinuteStat};

struct AppState {
    agg: Arc<Mutex<Aggregator>>,
    db: Arc<Mutex<Connection>>,
    started_at_unix: u64,
}

#[derive(Serialize, Clone, Debug)]
pub struct TodaySummary {
    date: String,
    keystrokes: i64,
    left_clicks: i64,
    right_clicks: i64,
    middle_clicks: i64,
    other_clicks: i64,
    scrolls: i64,
    mouse_distance_px: f64,
    by_hour: Vec<HourlyStat>,
    active_minutes: i64,
    peak_minute_keys: i64,
    peak_minute: Option<(u32, u32)>, // (hour, minute)
}

#[derive(Serialize, Clone, Debug)]
pub struct AppMeta {
    platform: String,
    started_at_unix: u64,
    schema_version: i32,
    db_path: String,
}

#[tauri::command]
fn get_meta(state: tauri::State<'_, AppState>) -> Result<AppMeta, String> {
    let conn = state.db.lock();
    let info = storage::db_info(&conn).map_err(|e| e.to_string())?;
    let platform = if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "unknown"
    };
    Ok(AppMeta {
        platform: platform.into(),
        started_at_unix: state.started_at_unix,
        schema_version: info.schema_version,
        db_path: storage::db_path().to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn get_today(state: tauri::State<'_, AppState>) -> Result<TodaySummary, String> {
    let today = Local::now().date_naive();
    let (mut by_hour, active_min, recent) = {
        let conn = state.db.lock();
        let h = storage::hourly_for_date(&conn, today).map_err(|e| e.to_string())?;
        let a = storage::active_minutes(&conn, today).map_err(|e| e.to_string())?;
        let r = storage::recent_minutes(&conn, today, 1440)
            .map_err(|e| e.to_string())?;
        (h, a, r)
    };

    // Find peak minute across all minute rows today
    let (peak_minute_keys, peak_minute) = recent
        .iter()
        .max_by_key(|m| m.keystrokes)
        .map(|m| (m.keystrokes, Some((m.hour, m.minute))))
        .unwrap_or((0, None));

    // Fold unflushed bucket into current hour
    let (mem_key, mem_bucket) = {
        let a = state.agg.lock();
        (a.current_key, a.bucket.clone())
    };
    let (mem_date, mem_hour, _mem_minute) = mem_key;
    if mem_date == today && !mem_bucket.is_empty() {
        match by_hour.iter_mut().find(|s| s.hour == mem_hour) {
            Some(existing) => {
                existing.keystrokes += mem_bucket.keystrokes as i64;
                existing.left_clicks += mem_bucket.left_clicks as i64;
                existing.right_clicks += mem_bucket.right_clicks as i64;
                existing.middle_clicks += mem_bucket.middle_clicks as i64;
                existing.other_clicks += mem_bucket.other_clicks as i64;
                existing.scrolls += mem_bucket.scrolls as i64;
                existing.mouse_distance_px += mem_bucket.mouse_distance_px;
            }
            None => {
                by_hour.push(HourlyStat {
                    date: today.to_string(),
                    hour: mem_hour,
                    keystrokes: mem_bucket.keystrokes as i64,
                    left_clicks: mem_bucket.left_clicks as i64,
                    right_clicks: mem_bucket.right_clicks as i64,
                    middle_clicks: mem_bucket.middle_clicks as i64,
                    other_clicks: mem_bucket.other_clicks as i64,
                    scrolls: mem_bucket.scrolls as i64,
                    mouse_distance_px: mem_bucket.mouse_distance_px,
                });
                by_hour.sort_by_key(|s| s.hour);
            }
        }
    }

    let mut summary = TodaySummary {
        date: today.to_string(),
        keystrokes: 0,
        left_clicks: 0,
        right_clicks: 0,
        middle_clicks: 0,
        other_clicks: 0,
        scrolls: 0,
        mouse_distance_px: 0.0,
        by_hour: Vec::new(),
        active_minutes: active_min,
        peak_minute_keys,
        peak_minute,
    };
    for s in &by_hour {
        summary.keystrokes += s.keystrokes;
        summary.left_clicks += s.left_clicks;
        summary.right_clicks += s.right_clicks;
        summary.middle_clicks += s.middle_clicks;
        summary.other_clicks += s.other_clicks;
        summary.scrolls += s.scrolls;
        summary.mouse_distance_px += s.mouse_distance_px;
    }
    summary.by_hour = by_hour;
    Ok(summary)
}

#[tauri::command]
fn get_daily(state: tauri::State<'_, AppState>, days: u32) -> Result<Vec<DailyStat>, String> {
    let conn = state.db.lock();
    storage::daily(&conn, days).map_err(|e| e.to_string())
}

/// `range`: "today" | "week" | "month" | "all"
#[tauri::command]
fn get_keys(state: tauri::State<'_, AppState>, range: String) -> Result<Vec<KeyCount>, String> {
    let conn = state.db.lock();
    let today = Local::now().date_naive();
    match range.as_str() {
        "today" => storage::top_keys_for_date(&conn, today, 1024).map_err(|e| e.to_string()),
        "week" => storage::keys_last_n_days(&conn, 7).map_err(|e| e.to_string()),
        "month" => storage::keys_last_n_days(&conn, 30).map_err(|e| e.to_string()),
        "all" => storage::keys_last_n_days(&conn, 0).map_err(|e| e.to_string()),
        _ => Err(format!("unknown range: {}", range)),
    }
}

#[tauri::command]
fn get_recent_minutes(
    state: tauri::State<'_, AppState>,
    limit: u32,
) -> Result<Vec<MinuteStat>, String> {
    let conn = state.db.lock();
    let today = Local::now().date_naive();
    storage::recent_minutes(&conn, today, limit).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_week_hourly(state: tauri::State<'_, AppState>) -> Result<Vec<HourlyStat>, String> {
    let conn = state.db.lock();
    storage::last_n_days_hourly(&conn, 7).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_db_info(state: tauri::State<'_, AppState>) -> Result<DbInfo, String> {
    let conn = state.db.lock();
    storage::db_info(&conn).map_err(|e| e.to_string())
}

fn final_flush(agg: &Mutex<Aggregator>, db: &Mutex<Connection>) {
    let batch = agg.lock().drain();
    if batch.is_empty() {
        return;
    }
    let mut conn = db.lock();
    if let Err(e) = storage::flush_batch(&mut conn, &batch) {
        eprintln!("final flush error: {}", e);
    }
}

fn spawn_flusher(agg: Arc<Mutex<Aggregator>>, db: Arc<Mutex<Connection>>) {
    thread::Builder::new()
        .name("flusher".into())
        .spawn(move || loop {
            thread::sleep(Duration::from_secs(5));
            let batch = agg.lock().drain();
            if batch.is_empty() {
                continue;
            }
            let mut conn = db.lock();
            if let Err(e) = storage::flush_batch(&mut conn, &batch) {
                eprintln!("flush error: {}", e);
            }
        })
        .expect("spawn flusher");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = storage::open().expect("open sqlite");
    let db = Arc::new(Mutex::new(conn));
    let agg = Arc::new(Mutex::new(Aggregator::new()));

    input::start(agg.clone());
    spawn_flusher(agg.clone(), db.clone());

    let agg_exit = agg.clone();
    let db_exit = db.clone();

    let started_at_unix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let state = AppState {
        agg,
        db,
        started_at_unix,
    };

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_meta,
            get_today,
            get_daily,
            get_keys,
            get_recent_minutes,
            get_week_hourly,
            get_db_info
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |_handle, event| {
        if let tauri::RunEvent::Exit = event {
            final_flush(&agg_exit, &db_exit);
        }
    });
}
