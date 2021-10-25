import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: 'src/index.mjs',
    output: {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
    },
    plugins: [
        nodeResolve(),
        commonjs(),
        babel({
            babelHelpers: 'bundled',
        }),
    ],
    external: [
        'fs/promises',
    ]
};
