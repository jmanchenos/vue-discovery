import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import json from 'eslint-plugin-json';

//tener acceso a intellisense de los atrinbutos de la configuracion

export default [
    js.configs.recommended,
    eslintConfigPrettier,
    ...json.configs['recommended'],
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
            'prettier/prettier': [
                'error',
                {
                    singleQuote: true,
                    semi: true,
                    trailingComma: 'es5',
                    tabWidth: 4,
                    useTabs: false,
                    bracketSpacing: true,
                    arrowParens: 'avoid',
                    printWidth: 120,
                    endOfLine: 'lf',
                },
            ],
            'no-const-assign': 'warn',
            'no-this-before-super': 'warn',
            'no-undef': 'warn',
            'no-unreachable': 'warn',
            'no-unused-vars': 'warn',
            'constructor-super': 'warn',
            'valid-typeof': 'warn',
        },
        files: ['**/*.js', '**/*.json'],
        ignores: ['**/node_modules/**', '**/dist/**', '**/.vscode/**', '**/.vscode-test/*', '**/test/*', '**/.*'],
    },
];
