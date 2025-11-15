import { fileURLToPath } from 'node:url';

import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';

import viteConfig from './vite.config.mjs';

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: fileURLToPath(new URL('./', import.meta.url)),
    test: {
      environment: 'jsdom',
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
      maxConcurrency: 1,
      fileParallelism: false,
      exclude: [...configDefaults.exclude, 'e2e/**'],
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            include: ['tests/unit/**/*.spec.ts'],
            exclude: ['tests/unit/scripts/**/*.spec.ts'],
            setupFiles: ['tests/setup/vitest.setup.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'unit-scripts',
            include: ['tests/unit/scripts/**/*.spec.ts'],
            environment: 'node',
          },
        },
        {
          extends: true,
          test: {
            name: 'translation',
            include: ['tests/translation/**/*.spec.ts'],
            environment: 'node',
          },
        },
      ],
    },
  })
);
