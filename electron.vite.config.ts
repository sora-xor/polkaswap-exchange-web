import { fileURLToPath, URL } from 'node:url';

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import viteConfig from './vite.config.mjs';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'electron/main/index.ts',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'electron/preload/index.ts',
      },
    },
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: 'src/renderer/index.html',
        },
      },
    },
    css: viteConfig.css,
    resolve: viteConfig.resolve,
    plugins: viteConfig.plugins,
  },
});
