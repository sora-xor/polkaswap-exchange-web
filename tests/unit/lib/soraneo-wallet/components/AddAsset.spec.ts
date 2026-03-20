import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/components/AddAsset/AddAssetTokenTab.vue', () => ({
  default: { name: 'AddAssetTokenTabStub' },
}));

vi.mock('@/lib/soraneo-wallet/src/components/AddAsset/AddAssetNftTab.vue', () => ({
  default: { name: 'AddAssetNftTabStub' },
}));

import AddAsset from '@/lib/soraneo-wallet/src/components/AddAsset/AddAsset.vue';
import { RouteNames } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet AddAsset', () => {
  it('reopens the tabs instead of leaving the flow when details are shown', () => {
    const navigate = vi.fn();
    const context = {
      showTabs: false,
      tokenDetailsPageOpened: true,
      navigate,
    };

    (AddAsset as any).methods.handleBack.call(context);

    expect(context.showTabs).toBe(true);
    expect(context.tokenDetailsPageOpened).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates back to the wallet screen when the tabs are already visible', () => {
    const navigate = vi.fn();

    (AddAsset as any).methods.handleBack.call({
      showTabs: true,
      tokenDetailsPageOpened: false,
      navigate,
    });

    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });
});
