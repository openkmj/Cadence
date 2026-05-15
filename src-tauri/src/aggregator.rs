use std::collections::{HashMap, VecDeque};

use chrono::{Local, NaiveDate, Timelike};

use crate::input::{InputEvent, MouseButton};

#[derive(Default, Debug, Clone)]
pub struct Bucket {
    pub keystrokes: u64,
    pub left_clicks: u64,
    pub right_clicks: u64,
    pub middle_clicks: u64,
    pub other_clicks: u64,
    pub scrolls: u64,
    pub mouse_distance_px: f64,
    /// Per-keycode keydown count. Keycode is platform-specific.
    pub key_counts: HashMap<u16, u64>,
}

impl Bucket {
    pub fn is_empty(&self) -> bool {
        self.keystrokes == 0
            && self.left_clicks == 0
            && self.right_clicks == 0
            && self.middle_clicks == 0
            && self.other_clicks == 0
            && self.scrolls == 0
            && self.mouse_distance_px == 0.0
            && self.key_counts.is_empty()
    }
}

/// (date, hour 0..23, minute 0..59)
pub type BucketKey = (NaiveDate, u32, u32);

pub struct Aggregator {
    pub current_key: BucketKey,
    pub bucket: Bucket,
    /// Sealed buckets from prior minutes waiting for the flusher.
    /// Bounded growth: at most one entry per minute since last flush.
    pending: VecDeque<(BucketKey, Bucket)>,
    last_mouse_pos: Option<(f64, f64)>,
}

fn now_key() -> BucketKey {
    let now = Local::now();
    (now.date_naive(), now.hour(), now.minute())
}

impl Aggregator {
    pub fn new() -> Self {
        Self {
            current_key: now_key(),
            bucket: Bucket::default(),
            pending: VecDeque::new(),
            last_mouse_pos: None,
        }
    }

    pub fn record(&mut self, event: InputEvent) {
        let key = now_key();
        if key != self.current_key {
            // Seal current bucket (don't drop it) so the flusher can persist it.
            let sealed_bucket = std::mem::take(&mut self.bucket);
            let sealed_key = self.current_key;
            if !sealed_bucket.is_empty() {
                self.pending.push_back((sealed_key, sealed_bucket));
            }
            self.current_key = key;
        }
        match event {
            InputEvent::KeyDown { keycode, .. } => {
                self.bucket.keystrokes += 1;
                *self.bucket.key_counts.entry(keycode).or_insert(0) += 1;
            }
            InputEvent::KeyUp { .. } => {}
            InputEvent::MouseDown { button, .. } => match button {
                MouseButton::Left => self.bucket.left_clicks += 1,
                MouseButton::Right => self.bucket.right_clicks += 1,
                MouseButton::Middle => self.bucket.middle_clicks += 1,
                MouseButton::Other(_) => self.bucket.other_clicks += 1,
            },
            InputEvent::MouseUp { .. } => {}
            InputEvent::Scroll { .. } => self.bucket.scrolls += 1,
            InputEvent::MouseMove { x, y } => {
                if let Some((px, py)) = self.last_mouse_pos {
                    let dx = x - px;
                    let dy = y - py;
                    self.bucket.mouse_distance_px += (dx * dx + dy * dy).sqrt();
                }
                self.last_mouse_pos = Some((x, y));
            }
        }
    }

    /// Take all sealed buckets plus the (possibly partial) current bucket.
    /// Empty buckets are skipped to avoid useless UPSERTs.
    pub fn drain(&mut self) -> Vec<(BucketKey, Bucket)> {
        let mut out: Vec<(BucketKey, Bucket)> = self.pending.drain(..).collect();
        if !self.bucket.is_empty() {
            let snapshot = std::mem::take(&mut self.bucket);
            out.push((self.current_key, snapshot));
        }
        out
    }
}
