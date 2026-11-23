import { describe, expect, it } from 'vitest';
import { Rectangle } from '../src/rectangle.js';

describe('Rectangle', () => {
    it('constructs from tuple and Rectangular metadata', () => {
        const rect = new Rectangle([10, 20, 300, 200]);
        expect(rect.x).toBe(10);
        expect(rect.y).toBe(20);
        expect(rect.width).toBe(300);
        expect(rect.height).toBe(200);

        const fromMeta = Rectangle.from_meta({ x: 5, y: 15, width: 100, height: 50 });
        expect(fromMeta.array).toEqual([5, 15, 100, 50]);
    });

    it('supports eq, clone, diff, and apply round-trip', () => {
        const a = new Rectangle([10, 20, 100, 200]);
        const b = new Rectangle([30, 50, 250, 400]);

        const copy = a.clone();
        expect(copy.eq(a)).toBe(true);
        copy.x = 999;
        expect(a.x).toBe(10);

        const delta = a.diff(b);
        expect(delta.array).toEqual([20, 30, 150, 200]);
        expect(a.clone().apply(delta).eq(b)).toBe(true);
    });

    it('checks contains and intersects accurately', () => {
        const outer = new Rectangle([0, 0, 100, 100]);
        const inner = new Rectangle([10, 10, 50, 50]);
        const overlapping = new Rectangle([80, 80, 50, 50]);
        const disjoint = new Rectangle([100, 100, 40, 40]);

        expect(outer.contains(inner)).toBe(true);
        expect(inner.contains(outer)).toBe(false);
        expect(outer.intersects(overlapping)).toBe(true);
        expect(outer.intersects(disjoint)).toBe(false);
    });

    it('clamps to containing bounds and formats cleanly', () => {
        const rect = new Rectangle([50, 60, 100, 100]);
        rect.clamp({ x: 0, y: 0, width: 120, height: 110 });
        expect(rect.array).toEqual([50, 60, 70, 50]);
        expect(rect.fmt()).toBe('Rect(50,60,70,50)');
    });
});
