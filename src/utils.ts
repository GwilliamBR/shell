import * as result from './result.js';
import * as error from './error.js';
import * as log from './log.js';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
const { Ok, Err } = result;
const { Error } = error;

export function is_wayland(): boolean {
    const meta_compat = Meta as unknown as { is_wayland_compositor?: () => boolean };
    if (typeof meta_compat.is_wayland_compositor === 'function') {
        return meta_compat.is_wayland_compositor();
    }
    // GNOME 50+ removed X11 support and Meta.is_wayland_compositor()
    return GLib.getenv('XDG_SESSION_TYPE') !== 'x11';
}

export function block_signal(object: GObject.Object, signal: SignalID) {
    GObject.signal_handler_block(object, signal);
}

export function unblock_signal(object: GObject.Object, signal: SignalID) {
    GObject.signal_handler_unblock(object, signal);
}

export function read_to_string(path: string): result.Result<string, error.Error> {
    const file = Gio.File.new_for_path(path);
    try {
        const [ok, contents] = file.load_contents(null);
        if (ok) {
            return Ok(new TextDecoder().decode(contents));
        } else {
            return Err(new Error(`failed to load contents of ${path}`));
        }
    } catch (e) {
        return Err(new Error(String(e)).context(`failed to load contents of ${path}`));
    }
}

export function source_remove(id: SignalID): boolean {
    return GLib.source_remove(id) as any;
}

export function exists(path: string): boolean {
    return Gio.File.new_for_path(path).query_exists(null);
}

/** Parses hex (#RGB, #RGBA, #RRGGBB, #RRGGBBAA) or rgb/rgba color strings into [r, g, b]. */
export function parse_color(color: string): [number, number, number] | null {
    const trimmed = color.trim().toLowerCase();

    const hex_match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(trimmed);
    if (hex_match) {
        const hex = hex_match[1];
        if (hex.length === 3 || hex.length === 4) {
            return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
        }
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }

    const rgb_match =
        /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*((?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s*)?\)$/.exec(
            trimmed,
        );
    if (!rgb_match) return null;

    const r = parseInt(rgb_match[1], 10);
    const g = parseInt(rgb_match[2], 10);
    const b = parseInt(rgb_match[3], 10);
    if (r > 255 || g > 255 || b > 255) return null;

    if (rgb_match[4] !== undefined) {
        const a = parseFloat(rgb_match[4]);
        if (Number.isNaN(a) || a < 0 || a > 1) return null;
    }

    return [r, g, b];
}

/**
 * Parse the current background color's darkness
 * https://stackoverflow.com/a/41491220 - the advanced solution
 * @param color - the RGBA or hex string value
 */
export function is_dark(color: string): boolean {
    const parsed = parse_color(color);
    const [r, g, b] = parsed ?? [255, 255, 255];

    let uicolors = [r / 255, g / 255, b / 255];
    let c = uicolors.map((col) => {
        if (col <= 0.03928) {
            return col / 12.92;
        }
        return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    let L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L <= 0.179;
}

/** Utility function for running a process in the background and fetching its standard output as a string. */
export function async_process(argv: Array<string>, input = null, cancellable: null | any = null): Promise<string> {
    let flags = Gio.SubprocessFlags.STDOUT_PIPE;

    if (input !== null) flags |= Gio.SubprocessFlags.STDIN_PIPE;

    let proc = new Gio.Subprocess({ argv, flags });
    proc.init(cancellable);

    proc.wait_async(null, (source: any, res: any) => {
        source.wait_finish(res);
        if (cancellable !== null) {
            cancellable.cancel();
        }
    });

    return new Promise((resolve, reject) => {
        proc.communicate_utf8_async(input, cancellable, (proc: any, res: any) => {
            try {
                let bytes = proc.communicate_utf8_finish(res)[1];
                resolve(bytes.toString());
            } catch (e) {
                reject(e);
            }
        });
    });
}

export type AsyncIPC = {
    child: any;
    stdout: any;
    stdin: any;
    cancellable: any;
};

export function async_process_ipc(argv: Array<string>): AsyncIPC | null {
    const { SubprocessLauncher, SubprocessFlags } = Gio;

    const launcher = new SubprocessLauncher({
        flags: SubprocessFlags.STDIN_PIPE | SubprocessFlags.STDOUT_PIPE,
    });

    let child: any;

    let cancellable = new Gio.Cancellable();

    try {
        child = launcher.spawnv(argv);
    } catch (why) {
        log.error(`failed to spawn ${argv}: ${why}`);
        return null;
    }

    let stdin = new Gio.DataOutputStream({
        base_stream: child.get_stdin_pipe(),
        close_base_stream: true,
    });

    let stdout = new Gio.DataInputStream({
        base_stream: child.get_stdout_pipe(),
        close_base_stream: true,
    });

    child.wait_async(null, (source: any, res: any) => {
        source.wait_finish(res);
        cancellable.cancel();
    });

    return { child, stdin, stdout, cancellable };
}

export function map_eq<K, V>(map1: Map<K, V>, map2: Map<K, V>) {
    if (map1.size !== map2.size) {
        return false;
    }

    let cmp;

    for (let [key, val] of map1) {
        cmp = map2.get(key);
        if (cmp !== val || (cmp === undefined && !map2.has(key))) {
            return false;
        }
    }

    return true;
}

export function os_release(): null | string {
    const [ok, bytes] = GLib.file_get_contents('/etc/os-release');
    if (!ok) return null;

    const contents: string = new TextDecoder().decode(bytes);
    for (const line of contents.split('\n')) {
        if (line.startsWith('VERSION_ID')) {
            return line.split('"')[1];
        }
    }

    return null;
}

/** Sets the alpha component of a color string (rgba or hex). */
export function set_alpha(color: string, alpha: number): string {
    if (!Number.isFinite(alpha)) return color;
    const parsed = parse_color(color);
    if (!parsed) return color;
    const [r, g, b] = parsed;
    const normalized = Number(Math.min(1, Math.max(0, alpha)).toFixed(6));
    return `rgba(${r}, ${g}, ${b}, ${normalized})`;
}

/** Checks if a string is a valid color (hex, rgb, rgba) without GI bindings. */
export function is_valid_color(color: string): boolean {
    return parse_color(color) !== null;
}
