import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { calculateStreak, parsePiniaParityTable, renderMarkdownRow } from '../../../../scripts/kpi/helpers';
import { collectMetrics, renderMarkdown } from '../../../../scripts/kpi/report';

describe('parsePiniaParityTable', () => {
  it('counts completed rows and computes ratio', () => {
    const markdown = `
| Pinia store | Legacy module | Status |
| ----------- | ------------- | ------ |
| src/a       | src/la        | ✅     |
| src/b       | src/lb        | ❌     |
| src/c       | src/lc        | ✅     |
`;

    const result = parsePiniaParityTable(markdown);

    expect(result.total).toBe(3);
    expect(result.completed).toBe(2);
    expect(result.ratio).toBeCloseTo(2 / 3);
  });
});

describe('calculateStreak', () => {
  it('returns number of consecutive success statuses from start of list', () => {
    const streak = calculateStreak(['success', { status: 'SUCCESS' }, { status: 'failed' }, 'success']);
    expect(streak).toBe(2);
  });
});

describe('renderMarkdownRow', () => {
  it('formats a history table row with metric values', () => {
    const row = renderMarkdownRow({
      timestamp: '2025-11-19T10:00:00.000Z',
      status: 'green',
      metrics: {
        classComponents: 12,
        piniaParity: 0.75,
        compatBuildStreak: 5,
        translationStreak: 6,
        bundleDelta: 0.0123,
      },
      notes: [],
    });

    expect(row).toBe('| 2025-11-19 | green | 12 | 75.0% | 5 | 6 | 1.23% |');
  });
});

describe('kpi report generation', () => {
  const createFixture = async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kpi-report-'));
    const srcDir = path.join(root, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'Classy.vue'),
      `<template></template>
<script lang="ts">
@Component
export default {};
</script>`
    );
    await fs.writeFile(path.join(srcDir, 'Plain.vue'), '<script setup>const foo = 1;</script>');

    const parityPath = path.join(root, 'docs/plans/pinia-store-parity.md');
    await fs.mkdir(path.dirname(parityPath), { recursive: true });
    await fs.writeFile(
      parityPath,
      `| Pinia store | Legacy module | Status |
| ----------- | ------------- | ------ |
| src/a       | src/la        | ✅     |
| src/b       | src/lb        | ❌     |
`
    );

    const ciStatusPath = path.join(root, 'ci-status.json');
    await fs.writeFile(
      ciStatusPath,
      JSON.stringify({
        compatBuilds: ['success', 'success', 'failed'],
        translationTests: [{ status: 'passed' }],
      })
    );

    const baselinePath = path.join(root, 'dist/reports/build/stats.json');
    const currentPath = path.join(root, 'dist/reports/build-vue3/stats.json');
    await fs.mkdir(path.dirname(baselinePath), { recursive: true });
    await fs.writeFile(baselinePath, JSON.stringify({ assets: [{ size: 1000 }, { size: 500 }] }));
    await fs.mkdir(path.dirname(currentPath), { recursive: true });
    await fs.writeFile(currentPath, JSON.stringify({ assets: [{ size: 1650 }] }));

    return { root };
  };

  it('aggregates metrics and renders markdown summary', async () => {
    const { root } = await createFixture();

    try {
      const report = await collectMetrics({
        output: 'json',
        root,
        ciPath: 'ci-status.json',
        parityPath: 'docs/plans/pinia-store-parity.md',
        bundleBaseline: 'dist/reports/build/stats.json',
        bundleCurrent: 'dist/reports/build-vue3/stats.json',
      });

      expect(report.metrics.classComponents).toBe(1);
      expect(report.metrics.piniaParity).toBeCloseTo(0.5);
      expect(report.metrics.compatBuildStreak).toBe(2);
      expect(report.metrics.translationStreak).toBe(1);
      expect(report.metrics.bundleDelta).toBeCloseTo(0.1);
      expect(report.status).toBe('yellow');
      expect(report.notes).toHaveLength(0);

      const markdown = renderMarkdown(report);
      expect(markdown).toContain('Status: **YELLOW**');
      expect(markdown).toContain('Class components remaining: 1');
      expect(markdown).toContain('Pinia parity: 50.0%');
      expect(markdown).toContain('Compat build streak: 2');
      expect(markdown).toContain('Translation streak: 1');
      expect(markdown).toContain('Bundle delta: 10.00%');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
