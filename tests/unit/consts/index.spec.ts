import { describe, expect, it } from 'vitest';

import { WalletPermissions } from '@/consts';

describe('WalletPermissions', () => {
  it('matches the production wallet action surface', () => {
    expect(WalletPermissions).toEqual({
      addAssets: true,
      addLiquidity: true,
      bridgeAssets: true,
      createAssets: true,
      sendAssets: true,
      showAssetDetails: true,
      swapAssets: true,
    });
  });
});
