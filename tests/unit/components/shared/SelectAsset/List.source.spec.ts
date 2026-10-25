import { describe, expect, it } from 'vitest';

import selectAssetListSource from '@/components/shared/SelectAsset/List.vue?raw';

describe('SelectAssetList source', () => {
  it('keeps overflowing asset balances expandable on hover', () => {
    expect(selectAssetListSource).toContain('value-class="asset__balance"');
    expect(selectAssetListSource).toContain('@include formatted-amount-tooltip;');
  });
});
