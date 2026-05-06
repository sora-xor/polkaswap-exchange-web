import { describe, expect, it } from 'vitest';

import { mergeVisibleAssetOrder } from '@/lib/soraneo-wallet/src/components/walletAssetsOrder';

describe('wallet asset row ordering', () => {
  it('reorders visible assets without moving hidden filtered assets', () => {
    const hiddenBefore = { address: 'hidden-before', visible: false };
    const xor = { address: 'xor', visible: true };
    const val = { address: 'val', visible: true };
    const hiddenAfter = { address: 'hidden-after', visible: false };

    const result = mergeVisibleAssetOrder(
      [hiddenBefore, xor, val, hiddenAfter],
      [val, xor],
      (asset) => asset.visible
    );

    expect(result).toEqual([hiddenBefore, val, xor, hiddenAfter]);
  });
});
