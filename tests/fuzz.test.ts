import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Arena } from '../src/arena.js';
import * as Lib from '../src/lib.js';
import { Rectangle } from '../src/rectangle.js';
import * as utils from '../src/utils.js';

describe('Property-based fuzz tests', () => {
    it('color parsing and alpha helpers handle arbitrary and valid colors safely', () => {
        fc.assert(
            fc.property(fc.string(), (input) => {
                const parsed = utils.parse_color(input);
                if (parsed !== null) {
                    expect(parsed).toHaveLength(3);
                    for (const ch of parsed) {
                        expect(ch).toBeGreaterThanOrEqual(0);
                        expect(ch).toBeLessThanOrEqual(255);
                    }
                    expect(utils.is_valid_color(input)).toBe(true);
                } else {
                    expect(utils.is_valid_color(input)).toBe(false);
                    expect(utils.is_dark(input)).toBe(false);
                }
            }),
        );

        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.double({ min: 0, max: 1, noNaN: true }),
                (r, g, b, alpha) => {
                    const updated = utils.set_alpha(`rgb(${r}, ${g}, ${b})`, alpha);
                    expect(utils.parse_color(updated)).toEqual([r, g, b]);
                },
            ),
        );
    });

    it('Rectangle preserves diff/apply inverse and symmetric intersection', () => {
        const rectArb = fc.tuple(
            fc.integer({ min: -5000, max: 5000 }),
            fc.integer({ min: -5000, max: 5000 }),
            fc.integer({ min: 1, max: 5000 }),
            fc.integer({ min: 1, max: 5000 }),
        );

        fc.assert(
            fc.property(rectArb, rectArb, (aArr, bArr) => {
                const a = new Rectangle(aArr);
                const b = new Rectangle(bArr);

                expect(a.clone().apply(a.diff(b)).eq(b)).toBe(true);
                expect(a.intersects(b)).toBe(b.intersects(a));
                if (a.contains(b)) {
                    expect(a.intersects(b)).toBe(true);
                }
            }),
        );
    });

    it('Lib rounding helpers stay finite and aligned to positive increments', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100000, max: 100000 }),
                fc.integer({ min: 1, max: 512 }),
                (value, increment) => {
                    const rounded = Lib.round_increment(value, increment);
                    expect(Math.abs(rounded % increment)).toBe(0);
                    expect(Math.abs(rounded - value)).toBeLessThanOrEqual(increment / 2);
                },
            ),
        );

        fc.assert(
            fc.property(
                fc.double({ min: -1e5, max: 1e5, noNaN: true, noDefaultInfinity: true }),
                fc.integer({ min: 0, max: 6 }),
                (value, digits) => {
                    const rounded = Lib.round_to(value, digits);
                    expect(Number.isFinite(rounded)).toBe(true);
                },
            ),
        );
    });

    it('Arena matches reference Map across arbitrary insert and remove sequences', () => {
        const opArb = fc.array(
            fc.oneof(
                fc.record({ kind: fc.constant('insert' as const), val: fc.integer() }),
                fc.record({ kind: fc.constant('remove' as const), slotHint: fc.nat(32) }),
            ),
            { maxLength: 60 },
        );

        fc.assert(
            fc.property(opArb, (ops) => {
                const arena = new Arena<number>();
                const model = new Map<number, number>();
                const keys: Array<number> = [];

                for (const op of ops) {
                    if (op.kind === 'insert') {
                        const id = arena.insert(op.val);
                        model.set(id, op.val);
                        keys.push(id);
                    } else if (keys.length > 0) {
                        const id = keys[op.slotHint % keys.length];
                        const removedArena = arena.remove(id);
                        const removedModel = model.get(id) ?? null;
                        model.delete(id);
                        expect(removedArena).toBe(removedModel);
                    }
                }

                for (const [id, val] of model) {
                    expect(arena.get(id)).toBe(val);
                }
            }),
        );
    });
});
