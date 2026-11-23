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

    const uicolors = [r / 255, g / 255, b / 255];
    const c = uicolors.map((col) => {
        if (col <= 0.03928) {
            return col / 12.92;
        }
        return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L <= 0.179;
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
