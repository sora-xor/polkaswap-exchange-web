import { fileURLToPath } from 'node:url';

import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';

import viteConfig from './vite.config.mjs';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Avoid Node 24 tinypool issues by using a single thread
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
      maxConcurrency: 1,
      fileParallelism: false,
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  })
);
