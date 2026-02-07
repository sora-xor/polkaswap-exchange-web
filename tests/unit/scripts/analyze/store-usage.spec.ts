import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractStoreAccesses,
  formatMarkdownReport,
  inferStoreUsageDomain,
  parseStoreUsageArgs,
  summarizeStoreAccesses,
  type StoreAccess,
} from '../../../../scripts/analyze/store-usage';

describe('store usage analyzer', () => {
  it('extractStoreAccesses captures optional chaining and columns', () => {
    const content = `
      import store from '@/store';
      const foo = store.state.foo;
      const value = store?.getters?.value;
      store.commit.orderBook.setSide();
      await store.dispatch?.orderBook?.subscribe();
    `;

    const matches = extractStoreAccesses(content);

    expect(matches).toHaveLength(4);
    expect(matches[0].type).toBe('state');
    expect(matches[1].type).toBe('getters');
    expect(matches[2].type).toBe('commit');
    expect(matches[3].type).toBe('dispatch');
    expect(matches[0].line).toBeGreaterThan(0);
    expect(matches[0].column).toBeGreaterThan(0);
  });

  it('inferStoreUsageDomain normalizes src subdirectories', () => {
    expect(inferStoreUsageDomain('src/components/pages/OrderBook/BookWidget.vue')).toBe('pages/OrderBook');
    expect(inferStoreUsageDomain('src/modules/pool/components/AddLiquidity/Form.vue')).toBe('modules/pool');
    expect(inferStoreUsageDomain('src/views/Bridge.vue')).toBe('views/Bridge');
    expect(inferStoreUsageDomain('src/lib/soraneo-wallet/src/index.ts')).toBe('lib/soraneo-wallet');
    expect(inferStoreUsageDomain('scripts/analyze/store-usage.ts')).toBe('scripts');
  });

  it('summarizeStoreAccesses aggregates totals by file and domain', () => {
    const accesses: StoreAccess[] = [
      {
        file: 'src/views/Bridge.vue',
        domain: 'views/Bridge',
        line: 1,
        column: 5,
        type: 'state',
        lineText: 'store.state',
      },
      {
        file: 'src/views/Bridge.vue',
        domain: 'views/Bridge',
        line: 2,
        column: 5,
        type: 'getters',
        lineText: 'store.getters',
      },
      {
        file: 'src/components/pages/OrderBook/BookWidget.vue',
        domain: 'pages/OrderBook',
        line: 3,
        column: 5,
        type: 'commit',
        lineText: 'store.commit',
      },
      {
        file: 'src/components/pages/OrderBook/BookWidget.vue',
        domain: 'pages/OrderBook',
        line: 4,
        column: 5,
        type: 'commit',
        lineText: 'store.commit',
      },
      {
        file: 'src/components/pages/OrderBook/BookWidget.vue',
        domain: 'pages/OrderBook',
        line: 5,
        column: 5,
        type: 'dispatch',
        lineText: 'store.dispatch',
      },
    ];

    const report = summarizeStoreAccesses(accesses);

    expect(report.totalAccesses).toBe(5);
    expect(report.totalFiles).toBe(2);
    expect(report.totalsByType.state).toBe(1);
    expect(report.totalsByType.getters).toBe(1);
    expect(report.totalsByType.commit).toBe(2);
    expect(report.totalsByType.dispatch).toBe(1);

    const [firstDomain] = report.domains;
    expect(firstDomain.domain).toBe('pages/OrderBook');
    expect(firstDomain.total).toBe(3);
    expect(firstDomain.files).toBe(1);

    const bridgeFile = report.files.find((file) => file.domain === 'views/Bridge');
    expect(bridgeFile?.counts.state).toBe(1);
    expect(bridgeFile?.counts.getters).toBe(1);
    expect(bridgeFile?.counts.commit).toBe(0);
  });

  it('formatMarkdownReport prints summary tables', () => {
    const report = summarizeStoreAccesses([
      {
        file: 'src/views/Bridge.vue',
        domain: 'views/Bridge',
        line: 1,
        column: 1,
        type: 'state',
        lineText: 'store.state',
      },
    ]);
    const markdown = formatMarkdownReport({ ...report, generatedAt: '2025-01-01T00:00:00.000Z' });

    expect(markdown).toContain('Legacy Store Usage Audit');
    expect(markdown).toContain('views/Bridge');
    expect(markdown).toContain('state 1');
  });

  it('parseStoreUsageArgs normalizes root-aware output paths', () => {
    const options = parseStoreUsageArgs([
      '--root=./',
      '--json=docs/reports/store.json',
      '--markdown=docs/reports/store.md',
    ]);

    const expectedRoot = path.resolve('./');
    expect(options.root).toBe(expectedRoot);
    expect(options.jsonPath).toBe(path.resolve(expectedRoot, 'docs/reports/store.json'));
    expect(options.markdownPath).toBe(path.resolve(expectedRoot, 'docs/reports/store.md'));
  });
});
