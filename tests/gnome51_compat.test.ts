import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

function collectTsFiles(dir: string): Array<string> {
    const out: Array<string> = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...collectTsFiles(full));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
            out.push(full);
        }
    }
    return out;
}

describe('GNOME Shell 48-51 compatibility', () => {
    it('declares GNOME 48-51 in metadata.json', () => {
        const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'metadata.json'), 'utf8'));
        expect(meta.uuid).toBe('pop-shell@system76.com');
        expect(meta['shell-version']).toEqual(['48', '49', '50', '51']);
    });

    it('contains zero removed GNOME 51 or legacy GJS APIs in Shell sources', () => {
        const files = collectTsFiles(path.join(ROOT, 'src')).filter((file) => {
            const rel = path.relative(ROOT, file);
            return (
                !rel.startsWith('src/color_dialog/') &&
                !rel.startsWith('src/floating_exceptions/') &&
                rel !== 'src/prefs.ts'
            );
        });

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const rel = path.relative(ROOT, file);

            expect(content, `${rel} imports Gdk`).not.toMatch(/gi:\/\/Gdk/);
            expect(content, `${rel} imports Gtk`).not.toMatch(/gi:\/\/Gtk/);
            expect(content, `${rel} uses removed St.IconType`).not.toMatch(/\bSt\.IconType\b/);
            expect(content, `${rel} imports ensureActorVisibleInScrollView from misc/util.js`).not.toMatch(
                /ensureActorVisibleInScrollView[\s\S]{0,120}misc\/util\.js/,
            );
            expect(content, `${rel} uses removed Gio.UnixOutputStream`).not.toMatch(
                /\bGio\.Unix(Output|Input)Stream\b/,
            );
            expect(content, `${rel} uses legacy imports.byteArray`).not.toMatch(/imports\.byteArray/);
            expect(content, `${rel} uses legacy St.BoxLayout vertical property`).not.toMatch(
                /new\s+St\.BoxLayout\(\{[^}]*\bvertical\b/,
            );
        }
    });

    it('keeps prefs.ts and all transitive runtime imports free of compositor-only GI modules', () => {
        const entry = path.join(ROOT, 'src/prefs.ts');
        const visited = new Set<string>();
        const queue: Array<string> = [entry];
        const runtimeImportRe = /(?:(?:import|export)\s+[\s\S]*?\sfrom\s+|import\s*\(?\s*)['"]([^'"]+)['"]/gm;

        while (queue.length > 0) {
            const current = queue.pop()!;
            if (visited.has(current)) continue;
            visited.add(current);

            const content = fs.readFileSync(current, 'utf8');
            const runtimeContent = content.replace(/^\s*(?:import|export)\s+type\b[\s\S]*?;\s*$/gm, '');
            const rel = path.relative(ROOT, current);

            expect(runtimeContent, `${rel} pulls compositor-only GI modules into prefs`).not.toMatch(
                /gi:\/\/(Meta|Shell|St|Clutter|Cogl|Mtk)\b/,
            );
            expect(runtimeContent, `${rel} imports Shell UI modules into prefs`).not.toMatch(
                /resource:\/\/\/org\/gnome\/shell\//,
            );

            for (const match of runtimeContent.matchAll(runtimeImportRe)) {
                const spec = match[1];
                if (!spec.startsWith('./') && !spec.startsWith('../')) continue;
                const resolved = path.resolve(path.dirname(current), spec.replace(/\.js$/, '.ts'));
                if (fs.existsSync(resolved)) queue.push(resolved);
            }
        }

        expect(visited.has(path.join(ROOT, 'src/settings.ts'))).toBe(true);
        expect(visited.has(path.join(ROOT, 'src/focus_position.ts'))).toBe(true);
        expect(visited.has(path.join(ROOT, 'src/geom.ts'))).toBe(false);
    });

    it('consolidates styles into stylesheet.css and defines all launcher CSS classes', () => {
        expect(fs.existsSync(path.join(ROOT, 'stylesheet.css'))).toBe(true);
        expect(fs.existsSync(path.join(ROOT, 'dark.css'))).toBe(false);
        expect(fs.existsSync(path.join(ROOT, 'light.css'))).toBe(false);
        expect(fs.existsSync(path.join(ROOT, 'highcontrast.css'))).toBe(false);

        const css = fs.readFileSync(path.join(ROOT, 'stylesheet.css'), 'utf8');
        const launcherFiles = collectTsFiles(path.join(ROOT, 'src/launcher'));
        const classes = new Set<string>();

        for (const file of launcherFiles) {
            const src = fs.readFileSync(file, 'utf8');
            for (const match of src.matchAll(/\bpop-shell-[a-z0-9-]+/g)) {
                classes.add(match[0]);
            }
        }

        expect(classes.size).toBeGreaterThan(0);
        for (const cls of classes) {
            expect(css, `stylesheet.css missing .${cls}`).toContain(`.${cls}`);
        }

        const shellClasses = [
            'pop-shell-overlay',
            'pop-shell-separator',
            'pop-shell-tab',
            'pop-shell-tab-active',
            'pop-shell-tab-inactive',
            'pop-shell-tab-urgent',
            'pop-shell-active-hint',
            'pop-shell-border-maximize',
            'pop-shell-border-normal',
        ];
        for (const cls of shellClasses) {
            expect(css, `stylesheet.css missing .${cls}`).toContain(`.${cls}`);
        }
    });
});
