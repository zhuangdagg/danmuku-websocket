import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

export default defineConfig({
  input: 'index.ts',
  output: [
    {
      file: './dist/danmaku-websocket.global.js',
      format: 'iife',
    },
    {
      file: './dist/danmaku-websocket.cjs.js',
      format: 'cjs',
    },
    {
      file: './dist/danmaku-websocket.esm-bundle.js',
      format: 'es',
    },
  ],

  plugins: [typescript({ noEmit: true, noImplicitAny: true })],
});
