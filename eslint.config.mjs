import prettier from 'eslint-plugin-prettier';
// import babel from '@babel/eslint-plugin';
import globals from 'globals';
// import babelParser from '@babel/eslint-parser';
import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    js.configs.recommended,
    prettierRecommended,
    {
        // ignores: [
        //     '**/gulp/',
        //     'node_modules/*',
        //     'modules/smsf-registration-form/',
        //     'modules/webinar-migrator/',
        // ],

        plugins: {
            prettier,
            // '@babel': babel,
        },

        languageOptions: {
            // parser: babelParser,
            ecmaVersion: 2021,
            sourceType: 'module',

            globals: {
                ...globals.node,
                window: true,
                console: true,
            },
            // parserOptions: {
            //     babelOptions: {
            //         presets: ['@babel/preset-react'],
            //     },
            // },
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
