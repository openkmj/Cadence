use std::sync::{Arc, OnceLock};
use std::thread;

use parking_lot::Mutex;
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::Input::KeyboardAndMouse::{KBDLLHOOKSTRUCT, MSLLHOOKSTRUCT};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage,
    HC_ACTION, HHOOK, MSG, WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN,
    WM_LBUTTONUP, WM_MBUTTONDOWN, WM_MBUTTONUP, WM_MOUSEMOVE, WM_MOUSEWHEEL, WM_MOUSEHWHEEL,
    WM_RBUTTONDOWN, WM_RBUTTONUP, WM_SYSKEYDOWN, WM_SYSKEYUP, WM_XBUTTONDOWN, WM_XBUTTONUP,
};

use crate::aggregator::Aggregator;
use crate::input::{InputEvent, MouseButton};

static AGG: OnceLock<Arc<Mutex<Aggregator>>> = OnceLock::new();

pub fn start(agg: Arc<Mutex<Aggregator>>) {
    if AGG.set(agg).is_err() {
        eprintln!("cadence: listener already started");
        return;
    }
    thread::Builder::new()
        .name("input-hook".into())
        .spawn(run)
        .expect("spawn input listener");
}

fn run() {
    unsafe {
        let kbd_hook = match SetWindowsHookExW(WH_KEYBOARD_LL, Some(kbd_proc), None, 0) {
            Ok(h) => h,
            Err(e) => {
                eprintln!("cadence: SetWindowsHookExW(keyboard) failed: {:?}", e);
                return;
            }
        };
        let mouse_hook = match SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), None, 0) {
            Ok(h) => h,
            Err(e) => {
                eprintln!("cadence: SetWindowsHookExW(mouse) failed: {:?}", e);
                return;
            }
        };

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        let _ = kbd_hook;
        let _ = mouse_hook;
    }
}

fn dispatch(event: InputEvent) {
    if let Some(agg) = AGG.get() {
        agg.lock().record(event);
    }
}

unsafe extern "system" fn kbd_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 {
        let info = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
        let keycode = info.vkCode as u16;
        let msg = wparam.0 as u32;
        match msg {
            WM_KEYDOWN | WM_SYSKEYDOWN => {
                dispatch(InputEvent::KeyDown {
                    keycode,
                    modifiers: 0,
                });
            }
            WM_KEYUP | WM_SYSKEYUP => {
                dispatch(InputEvent::KeyUp {
                    keycode,
                    modifiers: 0,
                });
            }
            _ => {}
        }
    }
    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}

unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 {
        let info = unsafe { &*(lparam.0 as *const MSLLHOOKSTRUCT) };
        let x = info.pt.x as f64;
        let y = info.pt.y as f64;
        let msg = wparam.0 as u32;
        match msg {
            WM_LBUTTONDOWN => dispatch(InputEvent::MouseDown {
                button: MouseButton::Left,
                x,
                y,
            }),
            WM_LBUTTONUP => dispatch(InputEvent::MouseUp {
                button: MouseButton::Left,
                x,
                y,
            }),
            WM_RBUTTONDOWN => dispatch(InputEvent::MouseDown {
                button: MouseButton::Right,
                x,
                y,
            }),
            WM_RBUTTONUP => dispatch(InputEvent::MouseUp {
                button: MouseButton::Right,
                x,
                y,
            }),
            WM_MBUTTONDOWN => dispatch(InputEvent::MouseDown {
                button: MouseButton::Middle,
                x,
                y,
            }),
            WM_MBUTTONUP => dispatch(InputEvent::MouseUp {
                button: MouseButton::Middle,
                x,
                y,
            }),
            WM_XBUTTONDOWN => {
                let btn = ((info.mouseData >> 16) & 0xFFFF) as u8;
                dispatch(InputEvent::MouseDown {
                    button: MouseButton::Other(btn),
                    x,
                    y,
                });
            }
            WM_XBUTTONUP => {
                let btn = ((info.mouseData >> 16) & 0xFFFF) as u8;
                dispatch(InputEvent::MouseUp {
                    button: MouseButton::Other(btn),
                    x,
                    y,
                });
            }
            WM_MOUSEMOVE => dispatch(InputEvent::MouseMove { x, y }),
            WM_MOUSEWHEEL => {
                let dy = (((info.mouseData >> 16) & 0xFFFF) as i16) as f64 / 120.0;
                dispatch(InputEvent::Scroll { dx: 0.0, dy });
            }
            WM_MOUSEHWHEEL => {
                let dx = (((info.mouseData >> 16) & 0xFFFF) as i16) as f64 / 120.0;
                dispatch(InputEvent::Scroll { dx, dy: 0.0 });
            }
            _ => {}
        }
    }
    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}
