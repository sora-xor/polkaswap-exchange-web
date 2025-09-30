import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.mjs',
    test: {
      name: 'unit',
      include: ['tests/unit/**/*'],
      // Use node env for stability, and polyfill window via setup files
      environment: 'node',
      setupFiles: ['tests/setup/vitest.setup.ts'],
      // Use a single thread to avoid tinypool issues on Node 24
      pool: 'threads',
      poolOptions: { threads: { singleThread: true } },
      maxConcurrency: 1,
      fileParallelism: false,
    },
  },
  {
    extends: './vitest.config.mjs',
    test: {
      name: 'translation',
      include: ['tests/translation/**/*'],
    },
  },
  {
    extends: './vitest.config.mjs',
    test: {
      name: 'e2e',
      include: ['tests/e2e/**/*'],
    },
  },
]);
