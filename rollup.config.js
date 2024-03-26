import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'

export default defineConfig({
    input: 'index.ts',
    output: [
        {
            file: './dist/bundle.js',
            format: 'iife'
        },
        {
            file: './dist/bundle.cjs',
            format: 'cjs'
        },
        {
            file: './dist/bundle.ejs',
            format: 'es'
        },
    ],
    plugins: [ typescript({ noEmit: true, noImplicitAny: true }) ]
})