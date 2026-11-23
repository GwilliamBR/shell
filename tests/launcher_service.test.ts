import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Gio, GLib, mockState, mockTimers } from './mocks/gi.js';
import { LauncherService } from '../src/launcher/service.js';
import type * as JsonIPC from '../src/launcher/protocol.js';

function createMockIpc(options: { readLines?: Array<string>; errorCode?: number; keepPending?: boolean } = {}) {
    const writes: Array<string> = [];
    const closedStreams: Array<string> = [];
    let cancelled = false;
    let lineIdx = 0;
    let pending = Boolean(options.keepPending);
    const readLines = options.readLines ?? [];

    const ipc = {
        child: {},
        cancellable: {
            cancel: () => {
                cancelled = true;
            },
        },
        stdin: {
            write_all: (data: string) => {
                writes.push(data);
            },
            has_pending: () => pending,
            close: () => {
                closedStreams.push('stdin');
            },
        },
        stdout: {
            read_line_async: (_priority: number, _cancellable: unknown, cb: (src: unknown, res: unknown) => void) => {
                if (lineIdx < readLines.length || options.errorCode !== undefined) {
                    cb(ipc.stdout, { token: lineIdx });
                }
            },
            read_line_finish: () => {
                if (options.errorCode !== undefined) {
                    const code = options.errorCode;
                    options.errorCode = undefined;
                    throw new GLib.Error('mock io error', Gio.IOErrorEnum as unknown as number, code);
                }
                const line = readLines[lineIdx++];
                if (line === undefined) return [null];
                return [new TextEncoder().encode(line)];
            },
            has_pending: () => pending,
            close: () => {
                closedStreams.push('stdout');
            },
        },
    };

    return {
        ipc,
        writes,
        closedStreams,
        setPending: (value: boolean) => {
            pending = value;
        },
        isCancelled: () => cancelled,
    };
}

describe('LauncherService IPC', () => {
    beforeEach(() => {
        mockTimers.reset();
        mockState.logs.length = 0;
    });

    afterEach(() => {
        mockTimers.reset();
        mockState.logs.length = 0;
    });

    it('serializes JSON IPC requests with trailing newlines', () => {
        const mock = createMockIpc();
        const service = new LauncherService(mock.ipc, () => {});

        service.query('term');
        service.activate(3);
        service.activate_context(3, 1);
        service.complete(2);
        service.context(4);
        service.quit(5);

        expect(mock.writes).toEqual([
            '{"Search":"term"}\n',
            '{"Activate":3}\n',
            '{"ActivateContext":{"id":3,"context":1}}\n',
            '{"Complete":2}\n',
            '{"Context":4}\n',
            '{"Quit":5}\n',
        ]);
    });

    it('decodes JSON responses from stdout asynchronously and stops on null EOF', () => {
        const responses: Array<JsonIPC.Response> = [];
        const mock = createMockIpc({
            readLines: ['"Clear"', '{"Update":[{"id":1,"name":"Files","description":"Open files"}]}'],
        });

        new LauncherService(mock.ipc, (res) => responses.push(res));

        expect(responses).toEqual(['Clear', { Update: [{ id: 1, name: 'Files', description: 'Open files' }] }]);
    });

    it('ignores Gio CANCELLED errors and survives unexpected read errors', () => {
        const responses: Array<JsonIPC.Response> = [];
        const cancelledMock = createMockIpc({ errorCode: Gio.IOErrorEnum.CANCELLED });
        new LauncherService(cancelledMock.ipc, (res) => responses.push(res));
        expect(responses).toEqual([]);
        expect(mockState.logs).toEqual([]);

        const failedMock = createMockIpc({ errorCode: 1 });
        new LauncherService(failedMock.ipc, (res) => responses.push(res));
        expect(responses).toEqual([]);
        expect(mockState.logs.some((msg) => msg.includes('pop-launcher'))).toBe(true);
    });

    it('sends Exit, cancels IPC, handles repeated exit(), and closes streams on drain or retry cap', () => {
        const mock = createMockIpc({ keepPending: true });
        const service = new LauncherService(mock.ipc, () => {});

        service.exit();
        const firstTimerId = [...mockTimers.callbacks.keys()][0];
        service.exit();
        expect(mockTimers.removed.has(firstTimerId)).toBe(true);

        const [[, secondTimerCb]] = [...mockTimers.callbacks.entries()];
        mock.setPending(false);
        expect(secondTimerCb()).toBe(GLib.SOURCE_REMOVE);
        expect(mock.closedStreams).toEqual(['stdin', 'stdout']);

        const cappedMock = createMockIpc({ keepPending: true });
        const cappedService = new LauncherService(cappedMock.ipc, () => {});
        mockTimers.reset();
        cappedService.exit();
        expect(cappedMock.writes).toContain('"Exit"\n');
        expect(cappedMock.isCancelled()).toBe(true);

        const [[, timerCb]] = [...mockTimers.callbacks.entries()];
        for (let i = 0; i < 19; i++) {
            expect(timerCb()).toBe(GLib.SOURCE_CONTINUE);
            expect(cappedMock.closedStreams).toEqual([]);
        }
        // 20th tick exceeds MAX_CLOSE_RETRIES and forces stream cleanup.
        expect(timerCb()).toBe(GLib.SOURCE_REMOVE);
        expect(cappedMock.closedStreams).toEqual(['stdin', 'stdout']);
    });
});
