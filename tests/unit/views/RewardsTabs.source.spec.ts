// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const viewPath = path.resolve(__dirname, '../../../src/features/rewards/pages/RewardsTabsPage.vue');

describe('Rewards tabs source', () => {
  it('keeps the top rewards navigation labels restrained and title case', async () => {
    const source = await readFile(viewPath, 'utf8');

    expect(source).toContain('$rewards-tabs-height: 56px;');
    expect(source).toContain('font-size: 16px;');
    expect(source).toContain('font-weight: 700;');
    expect(source).toContain('text-transform: none;');
    expect(source).toContain('height: 52px;');
    expect(source).toContain('font-size: 14px !important;');
    expect(source).not.toContain('font-size: 24px;');
    expect(source).not.toContain('font-size: 18px !important;');
  });
});
