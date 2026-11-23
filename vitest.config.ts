import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockGi = path.resolve(__dirname, 'tests/mocks/gi.ts');

export default defineConfig({
    resolve: {
        alias: [
            { find: /^gi:\/\/.*$/, replacement: mockGi },
            { find: /^resource:\/\/.*$/, replacement: mockGi },
        ],
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
});
