import { describe, expect, it } from 'vitest';

import walletAssetDetailsSource from '@/lib/soraneo-wallet/src/components/WalletAssetDetails.vue?raw';

describe('WalletAssetDetails source', () => {
  it('names icon-only asset actions for assistive technology', () => {
    expect(walletAssetDetailsSource).toContain(':aria-label="t(\'asset.remove\')"');
    expect(walletAssetDetailsSource).toContain(':aria-label="getOperationTooltip(operation)"');
    expect(walletAssetDetailsSource).toContain(':aria-label="t(\'code.receive\')"');
  });
});
