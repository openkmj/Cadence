use std::sync::Arc;

use parking_lot::Mutex;

use crate::aggregator::Aggregator;

#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    Other(u8),
}

/// Rich event payload. Some variants/fields are not consumed yet — they are present
/// so future features (modifier combos, mouse heatmaps, ...) can be added without
/// rewiring the platform layer.
#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
pub enum InputEvent {
    KeyDown { keycode: u16, modifiers: u32 },
    KeyUp { keycode: u16, modifiers: u32 },
    MouseDown { button: MouseButton, x: f64, y: f64 },
    MouseUp { button: MouseButton, x: f64, y: f64 },
    MouseMove { x: f64, y: f64 },
    Scroll { dx: f64, dy: f64 },
}

/// Spawn a background listener. Permission errors or platform failures are logged
/// but never propagated — the rest of the app keeps running.
pub fn start(agg: Arc<Mutex<Aggregator>>) {
    #[cfg(target_os = "macos")]
    crate::input_macos::start(agg);

    #[cfg(target_os = "windows")]
    crate::input_windows::start(agg);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = agg;
        eprintln!("cadence: unsupported platform — no input will be tracked");
    }
}
