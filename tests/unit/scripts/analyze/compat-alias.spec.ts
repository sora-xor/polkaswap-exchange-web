import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import {
  CompatUsage,
  createAllowMatcher,
  findCompatUsage,
  partitionCompatUsage,
} from '../../../../scripts/analyze/compat-alias';

const createUsage = (overrides: Partial<CompatUsage> = {}): CompatUsage => ({
  file: 'src/example.ts',
  module: '@/compat/sample',
  line: 1,
  lineText: "import foo from '@/compat/sample';",
  ...overrides,
});

describe('compat alias analyzer', () => {
  test('findCompatUsage returns compat imports with normalized paths', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'compat-usage-'));
    const compatFile = path.join(root, 'src', 'feature', 'uses-compat.ts');
    await mkdir(path.dirname(compatFile), { recursive: true });
    await writeFile(compatFile, "import { Status } from '@/compat/example';\nconsole.log(Status);\n", 'utf8');

    const usages = await findCompatUsage(root);

    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      file: 'src/feature/uses-compat.ts',
      module: '@/compat/example',
      line: 1,
    });
  });

  test('partitionCompatUsage splits matches based on allow matcher', () => {
    const matcher = createAllowMatcher([
      { pattern: 'src/allowed.ts', modules: ['@/compat/allowed'] },
      { pattern: 'tests/unit/**', modules: ['@/compat/*'] },
    ]);

    const { allowed, violations } = partitionCompatUsage(
      [
        createUsage({ file: 'src/allowed.ts', module: '@/compat/allowed' }),
        createUsage({ file: 'tests/unit/sample.spec.ts', module: '@/compat/foo' }),
        createUsage({ file: 'src/blocked.ts', module: '@/compat/blocked' }),
      ],
      matcher
    );

    expect(allowed).toHaveLength(2);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file: 'src/blocked.ts', module: '@/compat/blocked' });
  });

  test('createAllowMatcher supports wildcard module specifications', () => {
    const matcher = createAllowMatcher([{ pattern: 'src/**', modules: ['@/compat/*'] }]);

    expect(matcher(createUsage({ file: 'src/components/Widget.vue', module: '@/compat/something' }))).toBe(true);
    expect(matcher(createUsage({ file: 'scripts/tool.ts' }))).toBe(false);
  });
});
