import '@girs/gjs';
import '@girs/gjs/dom';
import '@girs/gnome-shell/ambient';
import '@girs/gnome-shell/extensions/global';

declare global {
    type SignalID = number;
    type WorkspaceID = number;
    type MonitorID = number;

    interface Rectangular {
        x: number;
        y: number;
        width: number;
        height: number;
    }

    interface DialogButtonAction {
        label: string;
        action: () => void;
        key?: number;
        default?: boolean;
    }

    type ProcessResult = [boolean, Uint8Array, Uint8Array, number];

    const log: (msg: string) => void;
    const print: (msg: string) => void;
    const printerr: (msg: string) => void;
    const imports: any;
    const ARGV: string[];
    const _: (text: string) => string;

    var popShellExtension: any;
}
