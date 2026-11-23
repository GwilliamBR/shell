import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockState } from './mocks/gi.js';
import { ExtensionSettings } from '../src/settings.js';

describe('ExtensionSettings theme and accessibility detection', () => {
    beforeEach(() => {
        mockState.gsettings.clear();
    });

    afterEach(() => {
        mockState.gsettings.clear();
    });

    it('uses GNOME color-scheme directly so default means light mode even with a dark gtk-theme', () => {
        mockState.gsettings.set('org.gnome.desktop.interface', {
            keys: ['color-scheme', 'gtk-theme', 'accent-color'],
            strings: {
                'color-scheme': 'default',
                'gtk-theme': 'adw-gtk3-dark',
                'accent-color': 'blue',
            },
        });

        const settings = new ExtensionSettings();
        expect(settings.is_dark()).toBe(false);

        mockState.gsettings.get('org.gnome.desktop.interface')!.strings!['color-scheme'] = 'prefer-dark';
        expect(settings.is_dark()).toBe(true);

        mockState.gsettings.get('org.gnome.desktop.interface')!.strings!['color-scheme'] = 'prefer-light';
        expect(settings.is_dark()).toBe(false);
    });

    it('falls back to gtk-theme / user-theme only when color-scheme key is unavailable', () => {
        mockState.gsettings.set('org.gnome.desktop.interface', {
            keys: ['gtk-theme'],
            strings: {
                'gtk-theme': 'Adwaita-dark',
            },
        });

        const settings = new ExtensionSettings();
        expect(settings.is_dark()).toBe(true);

        mockState.gsettings.get('org.gnome.desktop.interface')!.strings!['gtk-theme'] = 'Adwaita';
        expect(settings.is_dark()).toBe(false);
    });

    it('reads high-contrast from org.gnome.desktop.a11y.interface and falls back to theme name', () => {
        mockState.gsettings.set('org.gnome.desktop.interface', {
            keys: ['color-scheme', 'gtk-theme'],
            strings: {
                'color-scheme': 'default',
                'gtk-theme': 'HighContrast',
            },
        });
        expect(new ExtensionSettings().is_high_contrast()).toBe(true);

        mockState.gsettings.get('org.gnome.desktop.interface')!.strings!['gtk-theme'] = 'Adwaita';
        expect(new ExtensionSettings().is_high_contrast()).toBe(false);

        mockState.gsettings.set('org.gnome.desktop.a11y.interface', {
            keys: ['high-contrast'],
            booleans: {
                'high-contrast': true,
            },
        });

        const settings = new ExtensionSettings();
        expect(settings.is_high_contrast()).toBe(true);

        mockState.gsettings.get('org.gnome.desktop.a11y.interface')!.booleans!['high-contrast'] = false;
        expect(settings.is_high_contrast()).toBe(false);
    });

    it('reads system accent color and falls back to blue cleanly', () => {
        expect(new ExtensionSettings().get_system_accent_name()).toBe('blue');

        mockState.gsettings.set('org.gnome.desktop.interface', {
            keys: ['accent-color'],
            strings: { 'accent-color': 'orange' },
        });
        expect(new ExtensionSettings().get_system_accent_name()).toBe('orange');

        mockState.gsettings.get('org.gnome.desktop.interface')!.strings!['accent-color'] = '';
        expect(new ExtensionSettings().get_system_accent_name()).toBe('blue');
    });
});
