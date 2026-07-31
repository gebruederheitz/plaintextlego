import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    js.configs.recommended,
    prettierRecommended,
    {
        // ignores: [
        // ],

        plugins: {
            prettier,
        },

        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',

            globals: {
                ...globals.node,
                window: true,
                console: true,
            },
        },

        rules: {
            indent: ['error', 4, { SwitchCase: 1 }],
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'prettier/prettier': 'error',
        },
    },
];
