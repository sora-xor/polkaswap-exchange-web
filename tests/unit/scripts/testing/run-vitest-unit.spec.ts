import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildVitestArgs, resolveYarnEntry } from '../../../../scripts/testing/run-vitest-unit.mjs';

describe('run-vitest-unit', () => {
  it('builds a deterministic unit Vitest command by default', () => {
    expect(buildVitestArgs([])).toEqual([
      'vitest',
      'run',
      '--config',
      'vitest.config.mjs',
      '--project',
      'unit',
      '--reporter=dot',
      '--max-workers=1',
    ]);
  });

  it('preserves explicit reporter and project arguments', () => {
    expect(buildVitestArgs(['--project', 'unit-scripts', '--reporter=basic'])).toEqual([
      'vitest',
      'run',
      '--config',
      'vitest.config.mjs',
      '--max-workers=1',
      '--project',
      'unit-scripts',
      '--reporter=basic',
    ]);
  });

  it('resolves the pinned Yarn release from .yarnrc.yml', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'run-vitest-unit-'));
    await mkdir(path.join(root, '.yarn', 'releases'), { recursive: true });
    await writeFile(path.join(root, '.yarnrc.yml'), 'yarnPath: .yarn/releases/yarn-4.10.3.cjs\n', 'utf8');

    expect(resolveYarnEntry(root)).toBe(path.join(root, '.yarn', 'releases', 'yarn-4.10.3.cjs'));
  });
});
