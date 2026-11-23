import { beforeEach, describe, expect, it } from 'vitest';
import { Meta } from './mocks/gi.js';
import { mockState } from './mocks/gi.js';
import * as utils from '../src/utils.js';
import * as Lib from '../src/lib.js';

describe('Color utilities', () => {
    it('parses valid hex, rgb, and rgba formats', () => {
        expect(utils.parse_color('#000')).toEqual([0, 0, 0]);
        expect(utils.parse_color('#fff')).toEqual([255, 255, 255]);
        expect(utils.parse_color('#f84f')).toEqual([255, 136, 68]);
        expect(utils.parse_color('#fbb86c')).toEqual([251, 184, 108]);
        expect(utils.parse_color('#fbb86c80')).toEqual([251, 184, 108]);
        expect(utils.parse_color('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
        expect(utils.parse_color('rgba(251, 184, 108, 0.75)')).toEqual([251, 184, 108]);
        expect(utils.parse_color('rgba(0, 0, 0, .5)')).toEqual([0, 0, 0]);
    });

    it('rejects out-of-range and malformed colors', () => {
        expect(utils.is_valid_color('rgb(256, 0, 0)')).toBe(false);
        expect(utils.is_valid_color('rgba(0, 0, 0, 1.5)')).toBe(false);
        expect(utils.is_valid_color('rgba(0, 0, 0, -0.1)')).toBe(false);
        expect(utils.is_valid_color('#12345')).toBe(false);
        expect(utils.is_valid_color('not-a-color')).toBe(false);
    });

    it('updates alpha cleanly and leaves invalid inputs untouched', () => {
        expect(utils.set_alpha('#ff8800', 0.4)).toBe('rgba(255, 136, 0, 0.4)');
        expect(utils.set_alpha('rgb(12, 34, 56)', 0.9)).toBe('rgba(12, 34, 56, 0.9)');
        expect(utils.set_alpha('#010203', -0.5)).toBe('rgba(1, 2, 3, 0)');
        expect(utils.set_alpha('#010203', 1.5)).toBe('rgba(1, 2, 3, 1)');
        expect(utils.set_alpha('#010203', 1e-7)).toBe('rgba(1, 2, 3, 0)');
        expect(utils.set_alpha('#010203', Number.NaN)).toBe('#010203');
        expect(utils.set_alpha('#010203', Number.POSITIVE_INFINITY)).toBe('#010203');
        expect(utils.set_alpha('invalid', 0.5)).toBe('invalid');
    });

    it('computes relative luminance darkness accurately', () => {
        expect(utils.is_dark('#000000')).toBe(true);
        expect(utils.is_dark('rgb(24, 24, 24)')).toBe(true);
        expect(utils.is_dark('#ffffff')).toBe(false);
        expect(utils.is_dark('#fbb86c')).toBe(false);
        expect(utils.is_dark('invalid')).toBe(false);
    });
});

describe('Environment and Lib compatibility helpers', () => {
    beforeEach(() => {
        mockState.waylandCompositor = undefined;
        mockState.env.set('XDG_SESSION_TYPE', 'wayland');
    });

    it('detects Wayland on GNOME 50+ without Meta.is_wayland_compositor', () => {
        expect(utils.is_wayland()).toBe(true);
        mockState.env.set('XDG_SESSION_TYPE', 'x11');
        expect(utils.is_wayland()).toBe(false);
    });

    it('prefers Meta.is_wayland_compositor when running on older GNOME releases', () => {
        mockState.waylandCompositor = () => false;
        expect(utils.is_wayland()).toBe(false);
        mockState.waylandCompositor = () => true;
        expect(utils.is_wayland()).toBe(true);
    });

    it('creates separator without deprecated vertical property', () => {
        const sep = Lib.separator();
        expect(sep.props).toEqual({ style_class: 'pop-shell-separator', x_expand: true });
        expect(sep.props).not.toHaveProperty('vertical');
    });

    it('calls 0-arg or 1-arg maximize and unmaximize matching Meta.Window arity', () => {
        let calledWithArgs = -1;
        const win51 = {
            maximized_horizontally: false,
            maximized_vertically: false,
            maximize: () => {
                calledWithArgs = 0;
            },
            unmaximize: () => {
                calledWithArgs = 0;
            },
        };
        Lib.maximize(win51 as never);
        expect(calledWithArgs).toBe(0);
        calledWithArgs = -1;
        Lib.unmaximize(win51 as never);
        expect(calledWithArgs).toBe(0);

        let receivedFlag: unknown = null;
        const win48 = {
            maximized_horizontally: true,
            maximized_vertically: true,
            maximize: (flag: unknown) => {
                receivedFlag = flag;
            },
            unmaximize: (flag: unknown) => {
                receivedFlag = flag;
            },
        };
        Lib.maximize(win48 as never);
        expect(receivedFlag).toBe(Meta.MaximizeFlags.BOTH);
        receivedFlag = null;
        Lib.unmaximize(win48 as never);
        expect(receivedFlag).toBe(Meta.MaximizeFlags.BOTH);
    });
});
