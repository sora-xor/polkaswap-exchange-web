import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountAsset, Asset, RegisteredAccountAsset, Whitelist } from '@sora-substrate/sdk/build/assets/types';
import selectTokenSource from '@/components/shared/SelectAsset/SelectToken.vue?raw';

const searchFocusSpy = vi.hoisted(() => vi.fn());

const accountAssets: AccountAsset[] = [
  {
    address: 'xor-address',
    symbol: 'XOR',
    name: 'SORA',
    decimals: 18,
    externalDecimals: 18,
    precision: 18,
    isExternal: false,
    assetType: 'Token' as const,
    priceId: 'xor',
    balance: {
      transferable: '1000000000000000000',
    },
  },
  {
    address: 'val-address',
    symbol: 'VAL',
    name: 'Validator',
    decimals: 18,
    externalDecimals: 18,
    precision: 18,
    isExternal: false,
    assetType: 'Token' as const,
    priceId: 'val',
    balance: {
      transferable: '2000000000000000000',
    },
  },
  {
    address: 'custom-address',
    symbol: 'CUS',
    name: 'Custom',
    decimals: 18,
    externalDecimals: 18,
    precision: 18,
    isExternal: false,
    assetType: 'Token' as const,
    priceId: 'cus',
    balance: {
      transferable: '3000000000000000000',
    },
  },
];

const assets: Asset[] = accountAssets.map((asset) => ({
  address: asset.address,
  symbol: asset.symbol,
  name: asset.name,
  decimals: asset.decimals,
  externalDecimals: asset.externalDecimals,
  precision: asset.precision,
  isExternal: asset.isExternal,
  assetType: asset.assetType,
  priceId: asset.priceId,
}));

const assetLookup = new Map(
  accountAssets.map((asset) => [
    asset.address,
    {
      ...asset,
      externalAddress: asset.address,
    } as RegisteredAccountAsset,
  ])
);

const whitelist: Whitelist = Object.fromEntries(
  accountAssets
    .filter((asset) => asset.address !== 'custom-address')
    .map((asset) => [
      asset.address,
      {
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        icon: '',
      },
    ])
);

const assetsStoreMock = {
  assetDataByAddress: vi.fn((address?: string) => (address ? (assetLookup.get(address) ?? null) : null)),
};

const walletStoreMock = {
  whitelist,
  whitelistIdsBySymbol: {},
  isLoggedIn: false,
  assets,
  accountAssets,
  pinnedAssets: [],
  addAsset: vi.fn(),
};

const settingsStoreMock = {
  shouldBalanceBeHidden: false,
  libraryTheme: 'light',
  assetsFilter: 'All',
};

const DialogBaseStub = defineComponent({
  name: 'DialogBase',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    customClass: {
      type: String,
      default: '',
    },
    wrapperClass: {
      type: String,
      default: '',
    },
  },
  emits: ['update:visible'],
  template:
    '<div class="dialog-base-stub" :data-custom-class="customClass" :data-wrapper-class="wrapperClass"><slot /></div>',
});

const SearchInputStub = defineComponent({
  name: 'SearchInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'clear'],
  setup(props, { attrs, expose }) {
    expose({
      focus: searchFocusSpy,
    });

    return () =>
      h('div', { class: ['search-input-stub', attrs.class] }, [
        h('input', {
          class: 'search-input-inner',
          value: props.modelValue,
          placeholder: props.placeholder,
        }),
      ]);
  },
});

const SelectAssetListStub = defineComponent({
  name: 'SelectAssetList',
  props: {
    assets: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['click'],
  template: '<div class="select-asset-list-stub"></div>',
});

const getRenderedAssetAddresses = (wrapper: ReturnType<typeof mountComponent>): string[] => {
  const list = wrapper.getComponent(SelectAssetListStub);
  return ((list.props('assets') as RegisteredAccountAsset[] | undefined) ?? []).map((asset) => asset.address);
};

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: ref(false),
    withLoading: async <T>(callback: () => Promise<T> | T) => await callback(),
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreMock,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/router', () => ({
  lazyComponent: () => SelectAssetListStub,
}));

vi.mock('@/components/shared/SelectAsset/utils', () => ({
  isSelectableAsset: (value: unknown) => Boolean(value && typeof value === 'object' && 'address' in value),
}));

vi.mock('@/utils', () => ({
  sortAssets: (a: { symbol?: string }, b: { symbol?: string }) => (a.symbol ?? '').localeCompare(b.symbol ?? ''),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({
    api: {
      assets: {
        isWhitelist: (asset: Asset, whitelistValue: Whitelist | Asset[] | Array<string> | undefined) => {
          if (Array.isArray(whitelistValue)) {
            return whitelistValue.some((item) =>
              typeof item === 'string' ? item === asset.address : item.address === asset.address
            );
          }

          return Boolean(whitelistValue?.[asset.address]);
        },
        removeAccountAsset: vi.fn(),
      },
      dex: {
        poolBaseAssetsIds: [],
      },
    },
    components: {
      DialogBase: DialogBaseStub,
      SearchInput: SearchInputStub,
      TokenAddress: defineComponent({
        name: 'TokenAddress',
        template: '<div class="token-address-stub"></div>',
      }),
      AssetsFilter: defineComponent({
        name: 'AssetsFilter',
        template: '<div class="assets-filter-stub"></div>',
      }),
      AddAssetDetailsCard: defineComponent({
        name: 'AddAssetDetailsCard',
        template: '<div class="add-asset-details-card-stub"></div>',
      }),
    },
    WALLET_TYPES: {
      FilterOptions: {
        All: 'All',
      },
    },
    getAssetsSubset: (value: Asset[]) => value,
  });
});

let SelectToken: typeof import('@/components/shared/SelectAsset/SelectToken.vue').default;
let STabs: typeof import('@/lib/soramitsu-ui/components/Tabs/STabsPanel.vue').default;
let STab: typeof import('@/lib/soramitsu-ui/components/Tabs/STab.vue').default;

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SelectToken, {
    props: {
      visible: true,
      ...props,
    },
    global: {
      components: {
        STabs,
        STab,
      },
    },
  });

describe('SelectToken', () => {
  beforeEach(async () => {
    searchFocusSpy.mockClear();
    assetsStoreMock.assetDataByAddress.mockClear();
    walletStoreMock.addAsset.mockClear();
    walletStoreMock.assets = assets;
    walletStoreMock.accountAssets = accountAssets;
    walletStoreMock.whitelist = whitelist;

    ({ default: SelectToken } = await import('@/components/shared/SelectAsset/SelectToken.vue'));
    ({ default: STabs } = await import('@/lib/soramitsu-ui/components/Tabs/STabsPanel.vue'));
    ({ default: STab } = await import('@/lib/soramitsu-ui/components/Tabs/STab.vue'));
  });

  it('renders the modal styling hooks used by the token selector theme overrides', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.dialog-base-stub').attributes('data-custom-class')).toBe('asset-select');
    expect(wrapper.find('.dialog-base-stub').attributes('data-wrapper-class')).toBe('asset-select-wrapper');
    expect(wrapper.find('.s-tabs--exchange').exists()).toBe(true);
    expect(wrapper.find('.token-search').exists()).toBe(true);
    expect(wrapper.find('.search-input-inner').attributes('placeholder')).toBe('selectToken.searchPlaceholder');
  });

  it('locks the tab tray to the same horizontal gutters as the production token modal', () => {
    expect(selectTokenSource).toContain('.s-tabs--exchange .el-tabs__header {');
    expect(selectTokenSource).toContain('width: calc(100% - 2 * #{$inner-spacing-big}) !important;');
    expect(selectTokenSource).toContain('.s-tabs--exchange .el-tabs__nav-wrap,');
    expect(selectTokenSource).toContain('.s-tabs--exchange .el-tabs__nav-scroll {');
    expect(selectTokenSource).toContain('width: 100%;');
  });

  it('switches the search placeholder when the custom tab is selected', async () => {
    const wrapper = mountComponent();
    const tabs = wrapper.findAll('.el-tabs__item');

    expect(tabs).toHaveLength(2);

    await tabs[1]?.trigger('click');
    await nextTick();

    expect(wrapper.find('.search-input-inner').attributes('placeholder')).toBe('selectToken.custom.search');
    expect(searchFocusSpy).toHaveBeenCalled();
  });

  it('shows only whitelisted tokens in the assets tab and leaves non-whitelist assets in custom', async () => {
    const wrapper = mountComponent();
    const tabs = wrapper.findAll('.el-tabs__item');

    expect(getRenderedAssetAddresses(wrapper)).toEqual(expect.arrayContaining(['xor-address', 'val-address']));
    expect(getRenderedAssetAddresses(wrapper)).not.toContain('custom-address');

    await tabs[1]?.trigger('click');
    await nextTick();

    expect(getRenderedAssetAddresses(wrapper)).toEqual(['custom-address']);
  });

  it('does not render the empty asset list until whitelist-backed assets are ready', () => {
    walletStoreMock.whitelist = {};

    const wrapper = mountComponent();

    expect(wrapper.findComponent(SelectAssetListStub).exists()).toBe(false);
    expect(wrapper.text()).not.toContain('selectToken.emptyListMessage');
  });
});
