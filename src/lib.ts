import * as log from './log.js';
import * as rectangle from './rectangle.js';

import type { Rectangle } from './rectangle.js';

import Meta from 'gi://Meta';
import St from 'gi://St';

export interface SizeHint {
    minimum: [number, number];
    increment: [number, number];
    base: [number, number];
}

export enum Orientation {
    HORIZONTAL = 0,
    VERTICAL = 1,
}

export function nth_rev<T>(array: Array<T>, nth: number): T | null {
    return array[array.length - nth - 1];
}

export function current_monitor(): Rectangle {
    return rectangle.Rectangle.from_meta(
        global.display.get_monitor_geometry(global.display.get_current_monitor()) as Rectangular,
    );
}

// Fetch rectangle that represents the cursor
export function cursor_rect(): Rectangle {
    let [x, y] = global.get_pointer();
    return new rectangle.Rectangle([x, y, 1, 1]);
}

export function dbg<T>(value: T): T {
    log.debug(String(value));
    return value;
}

export function is_keyboard_op(op: number): boolean {
    const window_flag_keyboard = Meta.GrabOp.KEYBOARD_MOVING & ~Meta.GrabOp.WINDOW_BASE;
    return (op & window_flag_keyboard) != 0;
}

export function is_resize_op(op: number): boolean {
    const window_dir_mask =
        (Meta.GrabOp.RESIZING_N | Meta.GrabOp.RESIZING_E | Meta.GrabOp.RESIZING_S | Meta.GrabOp.RESIZING_W) &
        ~Meta.GrabOp.WINDOW_BASE;
    return (
        (op & window_dir_mask) != 0 ||
        (op & Meta.GrabOp.KEYBOARD_RESIZING_UNKNOWN) == Meta.GrabOp.KEYBOARD_RESIZING_UNKNOWN
    );
}

export function is_move_op(op: number): boolean {
    return !is_resize_op(op);
}

export function round_increment(value: number, increment: number): number {
    return Math.round(value / increment) * increment;
}

export function separator(): any {
    return new St.BoxLayout({ style_class: 'pop-shell-separator', x_expand: true });
}

// GNOME 49+ maximize/unmaximize act on both axes with zero arguments; GNOME 48 expects Meta.MaximizeFlags.
export function maximize(window: Meta.Window): void {
    if (window.maximize.length === 0) {
        window.maximize();
    } else {
        (window as unknown as { maximize(flags: Meta.MaximizeFlags): void }).maximize(Meta.MaximizeFlags.BOTH);
    }
}

export function unmaximize(window: Meta.Window): void {
    if (window.unmaximize.length === 0) {
        window.unmaximize();
    } else {
        (window as unknown as { unmaximize(flags: Meta.MaximizeFlags): void }).unmaximize(Meta.MaximizeFlags.BOTH);
    }
}

export function is_maximized(window: Meta.Window): boolean {
    return window.maximized_horizontally || window.maximized_vertically;
}

/** Returns the compositor actor for a Meta.Window, typed as Meta.WindowActor. */
export function window_actor(meta: Meta.Window): Meta.WindowActor | null {
    return meta.get_compositor_private() as Meta.WindowActor | null;
}
