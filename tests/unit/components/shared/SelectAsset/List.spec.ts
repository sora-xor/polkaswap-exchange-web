import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const formattingMocks = vi.hoisted(() => ({
  formatAssetBalance: vi.fn(() => '123.45'),
  getFiatBalance: vi.fn(() => '$456'),
  getAssetFiatPrice: vi.fn(() => '1'),
}));

const storeSpies = vi.hoisted(() => {
  const pinnedAssets = new Set<string>();

  return {
    pinnedAssets,
    setPinnedAsset: vi.fn((asset: AccountAsset) => {
      pinnedAssets.add(asset.address);
    }),
    removePinnedAsset: vi.fn((asset: AccountAsset) => {
      pinnedAssets.delete(asset.address);
    }),
  };
});

vi.mock('@/lib/soraneo-wallet/src/util/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
  runtimeStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
  settingsStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `t:${key}`,
  }),
}));

vi.mock('@/composables/useAssetFormatting', () => ({
  useAssetFormatting: () => ({
    ...formattingMocks,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/AssetList.vue', () => ({
  default: defineComponent({
    name: 'AssetListStub',
    props: {
      assets: {
        type: Array,
        default: () => [],
      },
    },
    setup(props, { slots }) {
      return () =>
        props.assets.length
          ? h(
              'div',
              { class: 'asset-list-stub' },
              props.assets.map((asset, index) =>
                h(
                  'div',
                  {
                    class: 'asset-list-row',
                    'data-index': index,
                  },
                  [slots.default?.(asset), slots.action?.(asset)].filter(Boolean)
                )
              )
            )
          : h('div', { class: 'asset-list-empty-slot' }, slots['list-empty']?.());
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue', () => ({
  default: defineComponent({
    name: 'FormattedAmountWithFiatValueStub',
    props: {
      value: {
        type: String,
        default: '',
      },
      fiatValue: {
        type: [String, Number],
        default: '',
      },
    },
    setup(props) {
      return () =>
        h('div', { class: 'formatted-amount-with-fiat-stub' }, [
          h('span', { class: 'value' }, props.value),
          h('span', { class: 'fiat' }, props.fiatValue),
        ]);
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/PinIcon.vue', () => ({
  default: defineComponent({
    name: 'PinIconStub',
    props: {
      isPinned: {
        type: Boolean,
        default: false,
      },
    },
    setup(props) {
      return () => h('span', { class: 'pin-icon-stub', 'data-pinned': props.isPinned });
    },
  }),
}));

vi.mock('@/stores/wallet', () => {
  const { pinnedAssets, setPinnedAsset, removePinnedAsset } = storeSpies;

  return {
    useWalletStore: () => ({
      isAssetPinned: (asset: AccountAsset) => pinnedAssets.has(asset.address),
      setPinnedAsset,
      removePinnedAsset,
    }),
  };
});

let SelectAssetList: typeof import('@/components/shared/SelectAsset/List.vue').default;

const defaultAsset: AccountAsset = {
  address: 'token-1',
  symbol: 'AAA',
  name: 'AAA token',
  decimals: 18,
  externalDecimals: 18,
  precision: 18,
  isExternal: false,
  assetType: 'Token' as const,
  priceId: 'AAA',
  balance: {
    transferable: '1000000000000000000',
  },
};

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SelectAssetList, {
    props: {
      assets: [defaultAsset],
      connected: true,
      ...props,
    },
  });

describe('SelectAssetList', () => {
  beforeEach(async () => {
    ({ default: SelectAssetList } = await import('@/components/shared/SelectAsset/List.vue'));
    formattingMocks.formatAssetBalance.mockClear();
    formattingMocks.getFiatBalance.mockClear();
    formattingMocks.getAssetFiatPrice.mockClear();
    storeSpies.setPinnedAsset.mockClear();
    storeSpies.removePinnedAsset.mockClear();
    storeSpies.pinnedAssets.clear();
  });

  it('renders empty placeholder when there are no assets', () => {
    const wrapper = mount(SelectAssetList, {
      props: {
        assets: [],
        connected: false,
      },
    });

    expect(wrapper.find('.asset-select-list__empty').text()).toContain('t:selectToken.emptyListMessage');
  });

  it('formats balances using asset formatting helpers', () => {
    const wrapper = mountComponent();

    expect(formattingMocks.formatAssetBalance).toHaveBeenCalledWith(defaultAsset, {
      formattedZero: '-',
      internal: true,
      showZeroBalance: true,
    });
    expect(formattingMocks.formatAssetBalance).toHaveBeenCalledTimes(1);

    expect(wrapper.find('.formatted-amount-with-fiat-stub .value').text()).toBe('123.45');
    expect(formattingMocks.getFiatBalance).toHaveBeenCalledWith(defaultAsset);
    expect(formattingMocks.getFiatBalance).toHaveBeenCalledTimes(1);
  });

  it('toggles pinned state via legacy wallet mutations', async () => {
    const wrapper = mountComponent();
    const pinButton = wrapper.find('.pin-button');

    await pinButton.trigger('click');
    expect(storeSpies.setPinnedAsset).toHaveBeenCalledTimes(1);
    expect(storeSpies.removePinnedAsset).not.toHaveBeenCalled();

    await pinButton.trigger('click');
    expect(storeSpies.removePinnedAsset).toHaveBeenCalledTimes(1);
  });
});
