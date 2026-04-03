import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());
const addAsset = vi.hoisted(() => vi.fn());
const getWhitelist = vi.hoisted(() => vi.fn(async () => {}));
const subscribeOnAssets = vi.hoisted(() => vi.fn(async () => {}));
const walletMockState = vi.hoisted(() => ({
  whitelist: {} as Record<string, unknown>,
  assets: [] as any[],
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => ({
    navigate,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    get assets() {
      return walletMockState.assets;
    },
    get accountAssets() {
      return [];
    },
    get accountAssetsAddressTable() {
      return {};
    },
    get whitelist() {
      return walletMockState.whitelist;
    },
    addAsset,
    getWhitelist,
    subscribeOnAssets,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
  useLoading: () => {
    const loading = ref(false);
    return {
      loading,
      parentLoading: ref(false),
      withLoading: async (handler: () => Promise<unknown>) => {
        loading.value = true;
        try {
          return await handler();
        } finally {
          loading.value = false;
        }
      },
    };
  },
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    showAppNotification: vi.fn(),
    t: (key: string) => key,
  }),
}));

import { useAddAsset } from '@/lib/soraneo-wallet/src/composables/useAddAsset';

describe('useAddAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletMockState.whitelist = {};
    walletMockState.assets = [];
  });

  it('hydrates whitelist and assets when the add-asset catalog is empty', async () => {
    const state = useAddAsset();

    await state.ensureAssetCatalogLoaded();

    expect(getWhitelist).toHaveBeenCalledTimes(1);
    expect(subscribeOnAssets).toHaveBeenCalledTimes(1);
  });

  it('skips catalog hydration when assets and whitelist are already present', async () => {
    walletMockState.whitelist = { xor: { symbol: 'XOR' } };
    walletMockState.assets = [{ address: 'xor', symbol: 'XOR', name: 'SORA', decimals: 18 }];

    const state = useAddAsset();

    await state.ensureAssetCatalogLoaded();

    expect(getWhitelist).not.toHaveBeenCalled();
    expect(subscribeOnAssets).not.toHaveBeenCalled();
  });
});
