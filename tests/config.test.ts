import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockState } from './mocks/gi.js';
import { CONF_FILE, Config } from '../src/config.js';

describe('Config float rules and persistence', () => {
    beforeEach(() => {
        fs.rmSync(mockState.configDir, { recursive: true, force: true });
    });

    afterEach(() => {
        fs.rmSync(mockState.configDir, { recursive: true, force: true });
        expect(CONF_FILE.startsWith(mockState.configDir)).toBe(true);
    });

    it('matches user exceptions and default float rules', () => {
        const config = new Config();

        expect(config.window_shall_float('Conky', 'System Monitor')).toBe(true);
        expect(config.window_shall_float('org.gnome.Terminal', 'bash')).toBe(false);

        config.add_app_exception('CustomApp');
        expect(config.window_shall_float('CustomApp', 'Main')).toBe(true);

        config.add_window_exception('Browser', 'Picture-in-Picture');
        expect(config.window_shall_float('Browser', 'Picture-in-Picture')).toBe(true);
        expect(config.window_shall_float('Browser', 'Home')).toBe(false);
    });

    it('deduplicates and removes user exceptions cleanly', () => {
        const config = new Config();
        config.add_app_exception('Calculator');
        config.add_app_exception('Calculator');
        expect(config.float).toHaveLength(1);

        config.remove_user_exception('Calculator', undefined);
        expect(config.float).toHaveLength(0);
    });

    it('persists to disk and reloads, handling malformed JSON safely', () => {
        const config = new Config();
        config.log_on_focus = true;
        config.add_window_exception('MyApp', 'Dialog');

        const reloaded = new Config();
        reloaded.reload();
        expect(reloaded.log_on_focus).toBe(true);
        expect(reloaded.float).toEqual([{ class: 'MyApp', title: 'Dialog' }]);

        const fallback = Config.from_json('{not-valid-json');
        expect(fallback.float).toEqual([]);
        expect(fallback.log_on_focus).toBe(false);
    });
});
