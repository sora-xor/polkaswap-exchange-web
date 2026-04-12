// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const viewPath = path.resolve(__dirname, '../../../../src/views/Explore/Pools.vue');

describe('Explore pools source', () => {
  it('renders TVL values directly instead of hiding them behind wallet fiat-price state', async () => {
    const source = await readFile(viewPath, 'utf8');

    expect(source).toContain(':value="row.tvlFormatted.amount"');
    expect(source).not.toContain('<data-row-skeleton');
    expect(source).not.toContain('pricesAvailable');
  });
});
