use std::sync::Arc;
use std::thread;

use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_graphics::event::{
    CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType, EventField,
};
use parking_lot::Mutex;

use crate::aggregator::Aggregator;
use crate::input::{InputEvent, MouseButton};

pub fn start(agg: Arc<Mutex<Aggregator>>) {
    thread::Builder::new()
        .name("input-tap".into())
        .spawn(move || run(agg))
        .expect("spawn input listener");
}

fn run(agg: Arc<Mutex<Aggregator>>) {
    let events_of_interest = vec![
        CGEventType::KeyDown,
        CGEventType::KeyUp,
        CGEventType::FlagsChanged,
        CGEventType::LeftMouseDown,
        CGEventType::LeftMouseUp,
        CGEventType::RightMouseDown,
        CGEventType::RightMouseUp,
        CGEventType::OtherMouseDown,
        CGEventType::OtherMouseUp,
        CGEventType::MouseMoved,
        CGEventType::LeftMouseDragged,
        CGEventType::RightMouseDragged,
        CGEventType::OtherMouseDragged,
        CGEventType::ScrollWheel,
    ];

    let tap = match CGEventTap::new(
        CGEventTapLocation::HID,
        CGEventTapPlacement::HeadInsertEventTap,
        CGEventTapOptions::ListenOnly,
        events_of_interest,
        move |_proxy, event_type, event| {
            if let Some(ev) = translate(event_type, event) {
                agg.lock().record(ev);
            }
            None
        },
    ) {
        Ok(t) => t,
        Err(_) => {
            eprintln!(
                "cadence: failed to create event tap — Accessibility / Input Monitoring permission is required."
            );
            return;
        }
    };

    let loop_source = match tap.mach_port.create_runloop_source(0) {
        Ok(s) => s,
        Err(_) => {
            eprintln!("cadence: failed to create runloop source");
            return;
        }
    };
    CFRunLoop::get_current().add_source(&loop_source, unsafe { kCFRunLoopCommonModes });
    tap.enable();
    CFRunLoop::run_current();
}

fn translate(
    event_type: CGEventType,
    event: &core_graphics::event::CGEvent,
) -> Option<InputEvent> {
    let modifiers = event.get_flags().bits() as u32;
    let loc = event.location();
    match event_type {
        CGEventType::KeyDown => {
            let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
            Some(InputEvent::KeyDown { keycode, modifiers })
        }
        CGEventType::KeyUp => {
            let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
            Some(InputEvent::KeyUp { keycode, modifiers })
        }
        CGEventType::FlagsChanged => None, // modifier press/release — not counted as keystroke
        CGEventType::LeftMouseDown => Some(InputEvent::MouseDown {
            button: MouseButton::Left,
            x: loc.x,
            y: loc.y,
        }),
        CGEventType::LeftMouseUp => Some(InputEvent::MouseUp {
            button: MouseButton::Left,
            x: loc.x,
            y: loc.y,
        }),
        CGEventType::RightMouseDown => Some(InputEvent::MouseDown {
            button: MouseButton::Right,
            x: loc.x,
            y: loc.y,
        }),
        CGEventType::RightMouseUp => Some(InputEvent::MouseUp {
            button: MouseButton::Right,
            x: loc.x,
            y: loc.y,
        }),
        CGEventType::OtherMouseDown => {
            let btn = event.get_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER) as u8;
            let button = if btn == 2 {
                MouseButton::Middle
            } else {
                MouseButton::Other(btn)
            };
            Some(InputEvent::MouseDown {
                button,
                x: loc.x,
                y: loc.y,
            })
        }
        CGEventType::OtherMouseUp => {
            let btn = event.get_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER) as u8;
            let button = if btn == 2 {
                MouseButton::Middle
            } else {
                MouseButton::Other(btn)
            };
            Some(InputEvent::MouseUp {
                button,
                x: loc.x,
                y: loc.y,
            })
        }
        CGEventType::MouseMoved
        | CGEventType::LeftMouseDragged
        | CGEventType::RightMouseDragged
        | CGEventType::OtherMouseDragged => Some(InputEvent::MouseMove { x: loc.x, y: loc.y }),
        CGEventType::ScrollWheel => {
            let dy =
                event.get_integer_value_field(EventField::SCROLL_WHEEL_EVENT_DELTA_AXIS_1) as f64;
            let dx =
                event.get_integer_value_field(EventField::SCROLL_WHEEL_EVENT_DELTA_AXIS_2) as f64;
            Some(InputEvent::Scroll { dx, dy })
        }
        _ => None,
    }
}
