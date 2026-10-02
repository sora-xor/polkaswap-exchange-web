import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { api, FPNumber } from '@sora-substrate/sdk';
import { BalanceType } from '@sora-substrate/sdk/build/assets/consts';
import { ref } from 'vue';

const walletStoreMock = vi.hoisted(() => ({
  accountAssets: [] as Array<Record<string, unknown>>,
  accountAssetsLoading: false,
  accountAssetsLoaded: true,
  isLoggedIn: true,
  shouldBalanceBeHidden: false,
  fiatPriceObject: {} as Record<string, string>,
  permissions: { addAssets: true } as Record<string, boolean>,
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
  getFPNumberFromCodec: vi.fn((value: string, _decimals?: number) => ({
    mul: () => ({ toLocaleString: () => value }),
  })),
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
    TranslationConsts: {},
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

import WalletAssets from '@/lib/soraneo-wallet/src/components/WalletAssets.vue';

const OVERLOCKED_XOR_BALANCE = {
  free: '1282912800090570272557',
  reserved: '1307257378743701428201',
  frozen: '9500000000000000000000',
  bonded: '0',
  locked: '2590170178834271700758',
  total: '2590170178834271700758',
  transferable: '-8217087199909429727443',
};

const overlockedXorAsset = {
  address: '0x0200000000000000000000000000000000000000000000000000000000000000',
  symbol: 'XOR',
  name: 'SORA',
  decimals: 18,
  balance: OVERLOCKED_XOR_BALANCE,
};

const mountWalletAssets = () =>
  mount(WalletAssets, {
    global: {
      stubs: {
        draggable: {
          props: ['modelValue'],
          template:
            '<div class="draggable-stub"><slot v-for="(element, index) in modelValue" name="item" :element="element" :index="index" /><slot name="footer" /></div>',
        },
        's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
        TokenLogo: { template: '<div class="token-logo-stub" />' },
        WalletAssetsHeadline: { template: '<div class="wallet-assets-headline-stub" />' },
      },
    },
  });

describe('Wallet WalletAssets', () => {
  beforeEach(() => {
    walletStoreMock.accountAssets = [];
    walletStoreMock.accountAssetsLoading = false;
    walletStoreMock.accountAssetsLoaded = true;
    walletStoreMock.isLoggedIn = true;
    walletStoreMock.shouldBalanceBeHidden = false;
    walletStoreMock.fiatPriceObject = {};
    walletStoreMock.permissions = { addAssets: true };
    walletStoreMock.filters = { option: 'All', verifiedOnly: false, zeroBalance: false };
    walletStoreMock.whitelist = {};
    walletStoreMock.isAssetPinned.mockImplementation((asset: { address: string }) => asset.address === 'pinned');

    formattedAmountMock.getAssetFiatPrice.mockReset();
    formattedAmountMock.getFPNumberFromCodec.mockImplementation((value: string, _decimals?: number) => ({
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

  it('does not show a false $0 total while a funded account is still hydrating', () => {
    walletStoreMock.accountAssetsLoaded = false;
    walletStoreMock.fiatPriceObject = { xor: '1000000000000000000' };

    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsLoading.value).toBe(true);
    expect(state.assetsFiatAmount.value).toBeNull();
  });

  it('shows $0 only after a genuinely empty account has finished hydrating', () => {
    walletStoreMock.accountAssetsLoaded = true;
    walletStoreMock.fiatPriceObject = { xor: '1000000000000000000' };

    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsLoading.value).toBe(false);
    expect(state.assetsFiatAmount.value).toBe('0');
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

  it('renders total ownership when the transferable balance is missing', () => {
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

    expect(state.getBalance(asset)).toBe('123600000000000000000');
    expect(formattedAmountMock.formatCodecNumber).toHaveBeenCalledWith('123600000000000000000', 18);
  });

  it('normalizes a parseable total codec balance independently from the spendable balance', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
    const total = '218116474998731886993';
    const asset = {
      address: 'xor',
      symbol: 'XOR',
      decimals: 18,
      balance: {
        total: `0x${BigInt(total).toString(16)}`,
        transferable: '1',
        locked: '0',
      },
    };

    expect(state.getBalance(asset)).toBe(total);
    expect(formattedAmountMock.formatCodecNumber).toHaveBeenCalledWith(total, 18);
  });

  it('sums total ownership for the wallet headline instead of only spendable balances', () => {
    const total = '30';
    const transferable = '7';
    walletStoreMock.fiatPriceObject = { xor: '1000000000000000000' };
    walletStoreMock.accountAssets = [
      {
        address: 'xor',
        symbol: 'XOR',
        decimals: 0,
        balance: { total, transferable, locked: '23' },
      },
    ];
    formattedAmountMock.getAssetFiatPrice.mockReturnValue('1000000000000000000');
    formattedAmountMock.getFPNumberFromCodec.mockImplementation((value: string, decimals?: number) =>
      FPNumber.fromCodecValue(value, decimals ?? 0)
    );

    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsFiatAmount.value).toBe('30');
    expect(formattedAmountMock.getFPNumberFromCodec).toHaveBeenCalledWith(total, 0);
    expect(formattedAmountMock.getFPNumberFromCodec).not.toHaveBeenCalledWith(transferable, 0);
  });

  it('renders total ownership, total fiat value, and an ordered restriction breakdown', () => {
    const originalAssets = api.assets;
    const transferable = '99601922365042012692';
    const free = '999601922365042012692';
    const frozen = '900000000000000000000';
    const reserved = '25000000000000000000';
    const bonded = '75000000000000000000';
    const locked = '1000000000000000000000';
    const total = '1099601922365042012692';
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
          free,
          reserved,
          frozen,
          bonded,
          locked,
          total,
          transferable,
        },
      },
    ];
    formattedAmountMock.formatCodecNumber.mockImplementation((value: string) => {
      if (value === transferable) return '99.6019223';
      if (value === free) return '999.6019223';
      if (value === frozen) return '900';
      if (value === reserved) return '25';
      if (value === bonded) return '75';
      if (value === locked) return '1,000';
      if (value === total) return '1,099.6019223';
      return value;
    });
    formattedAmountMock.getFiatBalance.mockReturnValue('423.44');

    try {
      const wrapper = mountWalletAssets();
      const assetValue = wrapper.get('.asset-value');

      expect(assetValue.text()).toContain('1,099.6019223');
      expect(assetValue.find('.formatted-amount__symbol').text()).toBe('XOR');
      expect(wrapper.get('.asset-value-locked').text()).toContain('99.6019223 assets.balance.transferable');
      expect(wrapper.text()).toContain('$423.44');
      expect(formattedAmountMock.getFiatBalance).toHaveBeenCalledWith(
        expect.objectContaining({ address: '0x0200000000000000000000000000000000000000000000000000000000000000' }),
        BalanceType.Total
      );
      expect(
        wrapper.findAll('.asset-value-locked-tooltip__row').map((row) => ({
          label: row.get('.asset-value-locked-tooltip__label').text(),
          value: row.get('.asset-value-locked-tooltip__value').text(),
        }))
      ).toEqual([
        { label: 'assets.balance.total', value: '1,099.6019223 XOR' },
        { label: 'assets.balance.transferable', value: '99.6019223 XOR' },
        { label: 'assets.balance.free', value: '999.6019223 XOR' },
        {
          label: 'assets.balance.frozen (pointSystem.governanceLockedXOR.titleProgress / StakingContainer)',
          value: '900 XOR',
        },
        { label: 'assets.balance.reserved', value: '25 XOR' },
        { label: 'assets.balance.bonded', value: '75 XOR' },
      ]);
      expect(wrapper.get('.asset-value-locked').attributes('aria-label')).not.toContain('assets.balance.locked');
    } finally {
      (api as any).assets = originalAssets;
    }
  });

  it('clamps a legacy overlocked transferable value, disables Send, and never formats a negative amount', () => {
    const originalAssets = api.assets;
    const fakeAssets = {
      ...(originalAssets ?? {}),
      isNft: vi.fn(() => false),
      isWhitelist: vi.fn(() => true),
    };
    (api as any).assets = fakeAssets;
    walletStoreMock.permissions = { addAssets: true, sendAssets: true };
    walletStoreMock.accountAssets = [overlockedXorAsset];
    formattedAmountMock.getFiatBalance.mockReturnValue('0');

    try {
      const wrapper = mountWalletAssets();

      expect(wrapper.get('.asset-value').text()).toContain(OVERLOCKED_XOR_BALANCE.total);
      expect(wrapper.get('.asset-value-locked').text()).toContain('0 assets.balance.transferable');
      expect(wrapper.find('.wallet-assets__button.send').exists()).toBe(false);
      expect(formattedAmountMock.formatCodecNumber.mock.calls.some(([value]) => String(value).startsWith('-'))).toBe(
        false
      );
      expect(wrapper.text()).not.toContain(OVERLOCKED_XOR_BALANCE.transferable);
    } finally {
      (api as any).assets = originalAssets;
    }
  });

  it('hides total, spendable, and restriction values when wallet privacy is enabled', () => {
    const originalAssets = api.assets;
    const fakeAssets = {
      ...(originalAssets ?? {}),
      isNft: vi.fn(() => false),
      isWhitelist: vi.fn(() => true),
    };
    (api as any).assets = fakeAssets;
    walletStoreMock.shouldBalanceBeHidden = true;
    walletStoreMock.accountAssets = [overlockedXorAsset];
    formattedAmountMock.getFiatBalance.mockReturnValue('123.45');

    try {
      const wrapper = mountWalletAssets();
      const tooltipValues = wrapper.findAll('.asset-value-locked-tooltip__value').map((value) => value.text());

      expect(walletStoreMock.shouldBalanceBeHidden).toBe(true);
      expect(wrapper.get('.asset-value-locked').text()).toContain('****** assets.balance.transferable');
      expect(tooltipValues.length).toBeGreaterThan(0);
      expect(tooltipValues.every((value) => value === '****** XOR')).toBe(true);
      expect(wrapper.text()).not.toContain(OVERLOCKED_XOR_BALANCE.total);
      expect(wrapper.text()).not.toContain('123.45');
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
