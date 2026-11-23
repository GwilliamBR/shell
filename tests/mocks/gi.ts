import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const mockTimers = {
    nextId: 1,
    callbacks: new Map<number, () => boolean | number>(),
    removed: new Set<number>(),
    reset() {
        this.nextId = 1;
        this.callbacks.clear();
        this.removed.clear();
    },
};

export const mockState = {
    configDir: path.join(os.tmpdir(), 'pop-shell-vitest-config'),
    env: new Map<string, string>([['XDG_SESSION_TYPE', 'wayland']]),
    waylandCompositor: undefined as (() => boolean) | undefined,
    logs: [] as Array<string>,
    gsettings: new Map<
        string,
        {
            keys: Array<string>;
            strings?: Record<string, string>;
            booleans?: Record<string, boolean>;
            uints?: Record<string, number>;
        }
    >(),
};

class MockFile {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    get_path(): string {
        return this.filePath;
    }

    get_child(child: string): MockFile {
        return new MockFile(path.join(this.filePath, child));
    }

    query_exists(): boolean {
        return fs.existsSync(this.filePath);
    }

    make_directory(): boolean {
        fs.mkdirSync(this.filePath, { recursive: true });
        return true;
    }

    create() {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        return {
            write_all: (data: string) => {
                fs.writeFileSync(this.filePath, data, 'utf8');
                return [true, data.length];
            },
        };
    }

    load_contents(): [boolean, Uint8Array] {
        const buf = fs.readFileSync(this.filePath);
        return [true, new Uint8Array(buf)];
    }

    replace_contents(data: string) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(this.filePath, data, 'utf8');
        return [true, ''];
    }
}

class MockGLibError extends Error {
    domain: number;
    code: number;

    constructor(message: string, domain = 1, code = 0) {
        super(message);
        this.domain = domain;
        this.code = code;
    }

    matches(domain: number, code: number): boolean {
        return this.domain === domain && this.code === code;
    }
}

export const GLib = {
    PRIORITY_DEFAULT: 0,
    PRIORITY_LOW: 300,
    SOURCE_REMOVE: false,
    SOURCE_CONTINUE: true,
    Error: MockGLibError,
    get_user_config_dir: () => mockState.configDir,
    getenv: (key: string) => mockState.env.get(key) ?? null,
    file_get_contents: (p: string): [boolean, Uint8Array] => {
        if (!fs.existsSync(p)) return [false, new Uint8Array()];
        return [true, new Uint8Array(fs.readFileSync(p))];
    },
    timeout_add: (_priority: number, _ms: number, cb: () => boolean | number) => {
        const id = mockTimers.nextId++;
        mockTimers.callbacks.set(id, cb);
        return id;
    },
    idle_add: (_priority: number, cb: () => boolean | number) => {
        const id = mockTimers.nextId++;
        mockTimers.callbacks.set(id, cb);
        return id;
    },
    source_remove: (id: number) => {
        mockTimers.removed.add(id);
        mockTimers.callbacks.delete(id);
        return true;
    },
};

class MockSettings {
    private schemaId: string;

    constructor(opts: { schema_id?: string; settings_schema?: { id: string } } = {}) {
        const schemaId = opts.schema_id ?? opts.settings_schema?.id ?? '';
        if (opts.schema_id && !mockState.gsettings.has(schemaId)) {
            throw new Error(`Schema ${schemaId} not found`);
        }
        this.schemaId = schemaId;
    }

    list_keys(): Array<string> {
        return mockState.gsettings.get(this.schemaId)?.keys ?? [];
    }

    get_string(key: string): string {
        return mockState.gsettings.get(this.schemaId)?.strings?.[key] ?? '';
    }

    get_boolean(key: string): boolean {
        return mockState.gsettings.get(this.schemaId)?.booleans?.[key] ?? false;
    }

    get_uint(key: string): number {
        return mockState.gsettings.get(this.schemaId)?.uints?.[key] ?? 0;
    }

    connect(): number {
        return 1;
    }

    disconnect(): void {}
}

export const Gio = {
    FileCreateFlags: { NONE: 0 },
    IOErrorEnum: { CANCELLED: 19 },
    SubprocessFlags: { STDIN_PIPE: 1, STDOUT_PIPE: 2 },
    File: {
        new_for_path: (p: string) => {
            const base = new MockFile(p);
            return Object.assign(base, {
                get_child: (child: string) => new MockFile(path.join(p, child)),
                get_path: () => p,
            });
        },
    },
    Settings: MockSettings,
    SettingsSchemaSource: {
        get_default: () => ({
            lookup: (id: string) => ({ id }),
        }),
        new_from_directory: () => ({
            lookup: (id: string) => ({ id }),
        }),
    },
};

export const GObject = {
    signal_handler_block: () => {},
    signal_handler_unblock: () => {},
};

export const Meta = {
    GrabOp: {
        WINDOW_BASE: 0,
        KEYBOARD_MOVING: 1 << 8,
        KEYBOARD_RESIZING_UNKNOWN: 1 << 9,
        RESIZING_N: 1 << 1,
        RESIZING_E: 1 << 2,
        RESIZING_S: 1 << 3,
        RESIZING_W: 1 << 4,
    },
    MaximizeFlags: { HORIZONTAL: 1, VERTICAL: 2, BOTH: 3 },
    get is_wayland_compositor() {
        return mockState.waylandCompositor;
    },
};

export const St = {
    BoxLayout: class {
        props: Record<string, unknown>;
        constructor(props: Record<string, unknown> = {}) {
            this.props = props;
        }
    },
};

export const Clutter = {
    Orientation: { HORIZONTAL: 0, VERTICAL: 1 },
};

(globalThis as Record<string, unknown>).log = (msg: string) => {
    mockState.logs.push(msg);
};

(globalThis as Record<string, unknown>).popShellExtension = {
    getSettings: () => ({
        get_uint: () => 4,
    }),
};

export default {
    ...GLib,
    ...Gio,
    ...GObject,
    ...Meta,
    ...St,
    ...Clutter,
    get is_wayland_compositor() {
        return mockState.waylandCompositor;
    },
    GLib,
    Gio,
    GObject,
    Meta,
    St,
    Clutter,
};
