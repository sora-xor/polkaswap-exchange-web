import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@sora-substrate/sdk';
import { ref } from 'vue';

const walletStoreMock = vi.hoisted(() => ({
  accountAssets: [] as Array<Record<string, unknown>>,
  fiatPriceObject: {} as Record<string, string>,
  permissions: { addAssets: true },
  filters: { option: 'All', verifiedOnly: false, zeroBalance: false },
  whitelist: {},
  isAssetPinned: vi.fn((asset: { address: string }) => asset.address === 'pinned'),
  setPinnedAsset: vi.fn(),
  removePinnedAsset: vi.fn(),
  setMultiplePinnedAssets: vi.fn(),
  setAccountAssets: vi.fn(),
  navigate: vi.fn(),
}));

const formattedAmountMock = vi.hoisted(() => ({
  getAssetFiatPrice: vi.fn(),
  getFPNumberFromCodec: vi.fn((value: string) => ({ mul: () => ({ toLocaleString: () => value }) })),
  formatCodecNumber: vi.fn((value: string) => value),
  isCodecZero: vi.fn((value: string) => value === '0'),
  getFiatBalance: vi.fn(),
  FontSizeRate: {},
  FontWeightRate: {},
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
  useLoading: () => ({
    loading: ref(false),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => formattedAmountMock,
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
    shouldBalanceBeHidden: ref(false),
    TranslationConsts: {},
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

import WalletAssets from '@/lib/soraneo-wallet/src/components/WalletAssets.vue';

describe('Wallet WalletAssets', () => {
  beforeEach(() => {
    walletStoreMock.accountAssets = [];
    walletStoreMock.fiatPriceObject = {};
    walletStoreMock.permissions = { addAssets: true };
    walletStoreMock.filters = { option: 'All', verifiedOnly: false, zeroBalance: false };
    walletStoreMock.whitelist = {};
    walletStoreMock.isAssetPinned.mockImplementation((asset: { address: string }) => asset.address === 'pinned');

    formattedAmountMock.getAssetFiatPrice.mockReset();
    formattedAmountMock.getFPNumberFromCodec.mockImplementation((value: string) => ({
      mul: () => ({ toLocaleString: () => value }),
    }));
    formattedAmountMock.formatCodecNumber.mockImplementation((value: string) => value);
    formattedAmountMock.isCodecZero.mockImplementation((value: string) => value === '0');
    formattedAmountMock.getFiatBalance.mockReset();

    walletStoreMock.setPinnedAsset.mockClear();
    walletStoreMock.removePinnedAsset.mockClear();
    walletStoreMock.setMultiplePinnedAssets.mockClear();
    walletStoreMock.setAccountAssets.mockClear();
    walletStoreMock.navigate.mockClear();
  });

  it('does not depend on translation or fiat refs coming from useFormattedAmount', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsFiatAmount.value).toBe(null);
    expect(state.permissions.value.addAssets).toBe(true);
  });

  it('keeps pinned and unpinned assets in separate draggable groups', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
    const canMove = state.onMove({
      draggedContext: { element: { address: 'pinned' } },
      relatedContext: { element: { address: 'free' } },
    });

    expect(canMove).toBe(false);
  });

  it('persists the reordered list through the computed assetList setter', () => {
    const originalAssets = api.assets;
    const fakeAssets = {
      ...(originalAssets ?? {}),
      updateAccountAssets: vi.fn(),
      accountAssetsAddresses: [] as string[],
    };
    (api as any).assets = fakeAssets;

    try {
      const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
      state.assetList.value = [{ address: 'pinned' }, { address: 'free' }];

      expect(walletStoreMock.setMultiplePinnedAssets).toHaveBeenCalledWith(['pinned']);
      expect(walletStoreMock.setAccountAssets).toHaveBeenCalledWith([{ address: 'pinned' }, { address: 'free' }]);
      expect(fakeAssets.accountAssetsAddresses).toEqual(['pinned', 'free']);
      expect(fakeAssets.updateAccountAssets).toHaveBeenCalledTimes(1);
    } finally {
      (api as any).assets = originalAssets;
    }
  });

  it('routes add-asset navigation through the wallet store boundary', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.handleOpenAddAsset();

    expect(walletStoreMock.navigate).toHaveBeenCalledWith({ name: 'AddAsset' });
  });

  it('falls back to a zero codec balance instead of rendering an empty asset amount', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
    const asset = {
      address: 'xor',
      symbol: 'XOR',
      decimals: 18,
      balance: {
        total: '123600000000000000000',
        locked: '0',
      },
    };

    expect(state.getBalance(asset)).toBe('0');
    expect(formattedAmountMock.formatCodecNumber).toHaveBeenCalledWith('0', 18);
  });

  it('uses codec math for zero-balance filtering instead of digit-position checks', () => {
    const originalAssets = api.assets;
    const fakeAssets = {
      ...(originalAssets ?? {}),
      isNft: vi.fn(() => false),
      isWhitelist: vi.fn(() => true),
    };
    (api as any).assets = fakeAssets;
    walletStoreMock.filters = { option: 'All', verifiedOnly: false, zeroBalance: true };
    formattedAmountMock.isCodecZero.mockImplementation((value: string) => value === '0');

    try {
      const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
      const isShown = state.showAsset({
        address: 'xor',
        symbol: 'XOR',
        decimals: 18,
        balance: {
          total: '12345678',
          transferable: '0',
          locked: '0',
        },
      });

      expect(isShown).toBe(true);
      expect(formattedAmountMock.isCodecZero).toHaveBeenCalledWith('12345678', 18);
    } finally {
      (api as any).assets = originalAssets;
    }
  });
});
