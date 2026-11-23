import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'scratch/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                global: 'readonly',
                log: 'readonly',
                print: 'readonly',
                printerr: 'readonly',
                imports: 'readonly',
                ARGV: 'readonly',
                _: 'readonly',
                TextDecoder: 'readonly',
                TextEncoder: 'readonly',
            },
        },
        rules: {
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-script-url': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-array-constructor': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            'no-undef': 'off',
            'prefer-const': 'off',
            'no-var': 'off',
            'no-empty': 'off',
            'no-case-declarations': 'off',
            'no-useless-assignment': 'off',
        },
    },
    {
        files: ['src/launcher/**/*.ts', 'tests/**/*.ts'],
        rules: {
            'prefer-const': 'error',
            'no-var': 'error',
            'no-empty': 'error',
        },
    },
    {
        files: ['tests/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
);
