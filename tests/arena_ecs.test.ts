import { describe, expect, it } from 'vitest';
import { Arena } from '../src/arena.js';
import { World } from '../src/ecs.js';

describe('Arena', () => {
    it('inserts, reads, removes, and reuses freed slots', () => {
        const arena = new Arena<string>();
        const id0 = arena.insert('first');
        const id1 = arena.insert('second');

        expect(id0).toBe(0);
        expect(id1).toBe(1);
        expect(arena.get(id0)).toBe('first');
        expect(arena.get(id1)).toBe('second');

        expect(arena.remove(id0)).toBe('first');
        expect(arena.get(id0)).toBeNull();
        expect(arena.remove(id0)).toBeNull();

        const reused = arena.insert('replacement');
        expect(reused).toBe(id0);
        expect([...arena.values()]).toEqual(['replacement', 'second']);
    });

    it('truncates active and free slots cleanly', () => {
        const arena = new Arena<number>();
        arena.insert(1);
        arena.insert(2);
        arena.insert(3);
        arena.truncate(1);
        expect([...arena.values()]).toEqual([1]);
    });
});

describe('ECS Storage and World', () => {
    it('tracks entities, component storages, and tags', () => {
        const world = new World();
        const names = world.register_storage<string>();

        expect(names.is_empty()).toBe(true);

        const e1 = world.create_entity();
        const e2 = world.create_entity();
        names.insert(e1, 'term');
        names.insert(e2, 'browser');

        expect(world.length).toBe(2);
        expect(names.is_empty()).toBe(false);
        expect(names.contains(e1)).toBe(true);
        expect(names.get(e2)).toBe('browser');
        expect(names.get_or(e1, () => 'fallback')).toBe('term');

        world.add_tag(e1, 42);
        expect(world.contains_tag(e1, 42)).toBe(true);
        world.delete_tag(e1, 42);
        expect(world.contains_tag(e1, 42)).toBe(false);

        expect([...names.find((v) => v === 'browser')]).toEqual([e2]);
        expect(names.with(e1, (v) => v.toUpperCase())).toBe('TERM');

        world.delete_entity(e2);
        expect(world.length).toBe(1);
        expect(names.get(e2)).toBeNull();

        // Reusing slot bumps generation so stale entity IDs do not match new components.
        const stale = [e2[0], e2[1]] as [number, number];
        const e3 = world.create_entity();
        names.insert(e3, 'editor');
        expect(e3[0]).toBe(stale[0]);
        expect(e3[1]).toBe(stale[1] + 1);
        expect(names.get(stale)).toBeNull();
        expect(names.get(e3)).toBe('editor');
    });
});
