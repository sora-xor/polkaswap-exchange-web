import { fileURLToPath, URL } from 'node:url';

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { createVuePlugin as vue } from 'vite-plugin-vue2';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/main.ts',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [vue()],
  },
});
