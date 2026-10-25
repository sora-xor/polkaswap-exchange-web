import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  createBuildCommand,
  createBundleReportCommand,
  createVitestCommand,
  parseCompatSmokeArgs,
} from '../../../../scripts/analyze/compat-smoke';

describe('compat smoke CLI', () => {
  test('parseCompatSmokeArgs returns defaults with normalized paths', () => {
    const options = parseCompatSmokeArgs([]);

    const expectedRoot = path.resolve(process.cwd());
    const expectedReport = path.join(expectedRoot, 'dist', 'reports', 'compat-alias-report.json');

    expect(options.root).toBe(expectedRoot);
    expect(options.aliasReportPath).toBe(expectedReport);
    expect(options.testPattern).toBe('Smoke');
    expect(options.skipTests).toBe(false);
    expect(options.skipBundleReport).toBe(false);
  });

  test('parseCompatSmokeArgs respects custom flags', () => {
    const options = parseCompatSmokeArgs([
      '--root=./tmp',
      '--alias-report=reports/custom.json',
      '--test-pattern=Quick',
      '--skip-tests',
      '--skip-bundle-report',
    ]);

    const expectedRoot = path.resolve(process.cwd(), './tmp');
    const expectedReport = path.join(expectedRoot, 'reports', 'custom.json');

    expect(options.root).toBe(expectedRoot);
    expect(options.aliasReportPath).toBe(expectedReport);
    expect(options.testPattern).toBe('Quick');
    expect(options.skipTests).toBe(true);
    expect(options.skipBundleReport).toBe(true);
  });

  test('create command generators produce yarn-based command specs', () => {
    const build = createBuildCommand();
    const vitest = createVitestCommand('Smoke');
    const bundle = createBundleReportCommand();

    expect(build.command).toBe('yarn');
    expect(build.args).toEqual(['build:vue3']);
    expect(build.env).toBeUndefined();

    expect(vitest.command).toBe('yarn');
    expect(vitest.args).toContain('vitest');
    expect(vitest.args).toContain('--testNamePattern');
    expect(vitest.args).toContain('--no-file-parallelism');
    expect(vitest.args).toContain('--maxWorkers');
    expect(vitest.args).toContain('1');
    expect(vitest.args).toContain('Smoke');

    expect(bundle.command).toBe('yarn');
    expect(bundle.args).toEqual(['tsx', 'scripts/analyze/bundle.ts']);
  });
});
