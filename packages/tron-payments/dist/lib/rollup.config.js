import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';
var pkg = require('./package.json');
var external = Object.keys(pkg.dependencies || {});
export default {
    input: 'src/index.ts',
    output: [
        { file: pkg.main, name: 'moneroPayments', format: 'umd', sourcemap: true },
        { file: pkg.module, format: 'es', sourcemap: true },
    ],
    external: external,
    watch: {
        include: 'src/**',
    },
    plugins: [
        json(),
        typescript({ useTsconfigDeclarationDir: true, tsconfig: './tsconfig.build.json' }),
        commonjs(),
        resolve(),
        sourceMaps(),
    ],
};
//# sourceMappingURL=rollup.config.js.map