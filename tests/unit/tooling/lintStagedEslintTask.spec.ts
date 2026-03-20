import { describe, expect, it, vi } from 'vitest';

import {
  createEslintFixCommand,
  getGitIgnoredFiles,
  selectLintStagedFiles,
} from '@/../scripts/lint-staged/eslint-task.mjs';

describe('scripts/lint-staged/eslint-task', () => {
  it('filters out deleted and git-ignored files before linting', () => {
    const files = ['src/keep.ts', 'src/deleted.ts', 'out/main/index.js'];

    expect(
      selectLintStagedFiles(files, {
        fileExists: (file) => file !== 'src/deleted.ts',
        ignoredFiles: new Set(['out/main/index.js']),
      })
    ).toEqual(['src/keep.ts']);
  });

  it('builds an eslint command from the remaining staged files', () => {
    const execFileSyncImpl = vi.fn(() => 'out/main/index.js\0');

    expect(
      createEslintFixCommand(['src/keep.ts', "src/quote's.ts", 'out/main/index.js', 'src/deleted.ts'], {
        execFileSyncImpl,
        fileExists: (file) => file !== 'src/deleted.ts',
      })
    ).toBe("eslint --fix --no-warn-ignored 'src/keep.ts' 'src/quote'\\''s.ts'");
  });

  it('returns an empty task when no lintable files remain', () => {
    expect(
      createEslintFixCommand(['src/deleted.ts', 'out/main/index.js'], {
        execFileSyncImpl: vi.fn(() => 'out/main/index.js\0'),
        fileExists: () => false,
      })
    ).toEqual([]);
  });

  it('treats exit status 1 from git check-ignore as no ignored files', () => {
    const error = new Error('not ignored') as Error & { status?: number };
    error.status = 1;

    expect(
      getGitIgnoredFiles(['src/keep.ts'], {
        execFileSyncImpl: vi.fn(() => {
          throw error;
        }),
      })
    ).toEqual(new Set());
  });
});
