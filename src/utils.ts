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

export { is_dark, is_valid_color, parse_color, set_alpha } from './color.js';

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
