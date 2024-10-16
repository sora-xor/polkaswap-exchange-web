import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['tests/unit/**/*'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'translation',
      include: ['tests/translation/**/*'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'e2e',
      include: ['tests/e2e/**/*'],
    },
  },
]);
