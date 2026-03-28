import { describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/stores/router', () => ({
  useRouterStore: () => ({
    navigate,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
    TranslationConsts: { NFT: 'NFT' },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/AddAsset/AddAssetTokenTab.vue', () => ({
  default: { name: 'AddAssetTokenTabStub' },
}));

vi.mock('@/lib/soraneo-wallet/src/components/AddAsset/AddAssetNftTab.vue', () => ({
  default: { name: 'AddAssetNftTabStub' },
}));

import AddAsset from '@/lib/soraneo-wallet/src/components/AddAsset/AddAsset.vue';
import { RouteNames } from '@/lib/soraneo-wallet/src/consts';

const createState = () =>
  (AddAsset as any).setup(
    {},
    {
      attrs: {},
      emit: vi.fn(),
      expose: vi.fn(),
      slots: {},
    }
  );

describe('Wallet AddAsset', () => {
  it('reopens the tabs instead of leaving the flow when details are shown', () => {
    const state = createState();

    state.showTabs.value = false;
    state.tokenDetailsPageOpened.value = true;
    state.handleBack();

    expect(state.showTabs.value).toBe(true);
    expect(state.tokenDetailsPageOpened.value).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates back to the wallet screen when the tabs are already visible', () => {
    const state = createState();

    state.handleBack();

    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });
});
