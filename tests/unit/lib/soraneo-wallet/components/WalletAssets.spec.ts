import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { api } from '@sora-substrate/sdk';
import { ref } from 'vue';

const walletStoreMock = vi.hoisted(() => ({
  accountAssets: [] as Array<Record<string, unknown>>,
  accountAssetsLoading: false,
  accountAssetsLoaded: true,
  isLoggedIn: true,
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
    walletStoreMock.accountAssetsLoading = false;
    walletStoreMock.accountAssetsLoaded = true;
    walletStoreMock.isLoggedIn = true;
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

  it('shows the wallet asset loading state while account assets hydrate', () => {
    walletStoreMock.accountAssetsLoading = true;

    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsLoading.value).toBe(true);
    expect(state.assetsAreHidden.value).toBe(true);
    expect(state.showEmptyAssets.value).toBe(false);
  });

  it('suppresses the empty state until the first account asset hydration settles', () => {
    walletStoreMock.accountAssetsLoaded = false;

    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsLoading.value).toBe(true);
    expect(state.assetsAreHidden.value).toBe(true);
    expect(state.showEmptyAssets.value).toBe(false);
  });

  it('shows the empty state after account asset hydration settles with no visible assets', () => {
    walletStoreMock.accountAssetsLoaded = true;

    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsLoading.value).toBe(false);
    expect(state.assetsAreHidden.value).toBe(true);
    expect(state.showEmptyAssets.value).toBe(true);
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

  it('normalizes parseable codec balances so the token amount renders with its fiat value', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
    const transferable = '218116474998731886993';
    const asset = {
      address: 'xor',
      symbol: 'XOR',
      decimals: 18,
      balance: {
        total: transferable,
        transferable: `0x${BigInt(transferable).toString(16)}`,
        locked: '0',
      },
    };

    expect(state.getBalance(asset)).toBe(transferable);
    expect(formattedAmountMock.formatCodecNumber).toHaveBeenCalledWith(transferable, 18);
  });

  it('renders the multisig XOR amount when fiat and locked balances are also present', () => {
    const originalAssets = api.assets;
    const transferable = '99601922365042012692';
    const locked = '900000000000000000000';
    const total = '999601922365042012692';
    const fakeAssets = {
      ...(originalAssets ?? {}),
      isNft: vi.fn(() => false),
      isWhitelist: vi.fn(() => true),
    };
    (api as any).assets = fakeAssets;
    walletStoreMock.accountAssets = [
      {
        address: '0x0200000000000000000000000000000000000000000000000000000000000000',
        symbol: 'XOR',
        name: 'SORA',
        decimals: 18,
        balance: {
          free: total,
          reserved: '0',
          frozen: locked,
          bonded: '0',
          locked,
          total,
          transferable,
        },
      },
    ];
    formattedAmountMock.formatCodecNumber.mockImplementation((value: string) => {
      if (value === transferable) return '99.6019223';
      if (value === locked) return '900';
      if (value === total) return '999.6019223';
      return value;
    });
    formattedAmountMock.getFiatBalance.mockReturnValue('423.44');

    try {
      const wrapper = mount(WalletAssets, {
        global: {
          stubs: {
            draggable: {
              props: ['modelValue'],
              template:
                '<div class="draggable-stub"><slot v-for="(element, index) in modelValue" name="item" :element="element" :index="index" /><slot name="footer" /></div>',
            },
            's-scrollbar': {
              template: '<div class="s-scrollbar-stub"><slot /></div>',
            },
            TokenLogo: {
              template: '<div class="token-logo-stub" />',
            },
            WalletAssetsHeadline: {
              template: '<div class="wallet-assets-headline-stub" />',
            },
          },
        },
      });
      const assetValue = wrapper.get('.asset-value');

      expect(assetValue.text()).toContain('99.6019223');
      expect(assetValue.find('.formatted-amount__symbol').text()).toBe('XOR');
      expect(assetValue.text()).toContain('900');
      expect(wrapper.text()).toContain('$423.44');
      expect(wrapper.find('.asset-value-locked').attributes('aria-label')).toContain(
        'assets.balance.frozen (pointSystem.governanceLockedXOR.titleProgress / StakingContainer): 900 XOR'
      );
      expect(
        wrapper.findAll('.asset-value-locked-tooltip__row').map((row) => ({
          label: row.get('.asset-value-locked-tooltip__label').text(),
          value: row.get('.asset-value-locked-tooltip__value').text(),
        }))
      ).toEqual([
        { label: 'assets.balance.transferable', value: '99.6019223 XOR' },
        { label: 'assets.balance.locked', value: '900 XOR' },
        {
          label: 'assets.balance.frozen (pointSystem.governanceLockedXOR.titleProgress / StakingContainer)',
          value: '900 XOR',
        },
        { label: 'assets.balance.total', value: '999.6019223 XOR' },
      ]);
    } finally {
      (api as any).assets = originalAssets;
    }
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
