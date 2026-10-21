import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import json from 'eslint-plugin-json';
import tseslint from 'typescript-eslint';

// La configuracion de Prettier se toma de .prettierrc.mjs (fuente unica de verdad)
const prettierRules = {
    'prettier/prettier': 'error',
};

export default tseslint.config(
    {
        // Ignores globales
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.vscode/**',
            '**/.vscode-test/**',
            '**/test/**',
            '**/package-lock.json',
            '**/tsconfig.json',
        ],
    },
    js.configs.recommended,
    eslintConfigPrettier,
    json.configs['recommended-with-comments'],
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: false,
                },
            },
            globals: {
                ...globals.mocha,
                ...globals.node,
                ...globals.builtin,
                ...globals.es2021,
            },
        },
        plugins: {
            prettier: prettier,
        },
        rules: {
            ...prettierRules,
            'no-const-assign': 'warn',
            'no-this-before-super': 'warn',
            'no-undef': 'warn',
            'no-unreachable': 'warn',
            'no-unused-vars': 'warn',
            'constructor-super': 'warn',
            'valid-typeof': 'warn',
        },
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    },
    {
        files: ['**/*.ts'],
        extends: [tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.builtin,
                ...globals.es2021,
            },
        },
        plugins: {
            prettier: prettier,
        },
        rules: {
            ...prettierRules,
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    }
);
