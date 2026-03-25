import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, beforeEach, it, vi } from 'vitest';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { BridgeRegisteredAsset } from '@/stores/assets/types';

const stubAssets: RegisteredAccountAsset[] = [];

const bridgeStoreMock = {
  isSoraToEvm: true,
};

const walletStoreMock = {
  shouldBalanceBeHidden: false,
};

const web3StoreMock = {
  selectedNetworkData: { shortName: 'ETH' },
};

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStoreMock,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => web3StoreMock,
}));

const assetsStoreMock = {
  registeredAssets: {} as Record<string, BridgeRegisteredAsset>,
};

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params?.network ? `network:${params.network}` : key),
    TranslationConsts: {},
    language: { value: 'en' },
    tOrdinal: (value: number | string) => `${value}`,
  }),
}));

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    name: 'SelectAssetList',
    props: ['assets', 'shouldBalanceBeHidden', 'isSoraToEvm'],
    emits: ['click'],
    template: '<div></div>',
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: {
        name: 'DialogBase',
        props: ['visible'],
        emits: ['update:visible'],
        template: '<div><slot /></div>',
      },
      SearchInput: {
        name: 'SearchInput',
        props: ['modelValue', 'placeholder'],
        emits: ['update:modelValue', 'clear'],
        template: '<input />',
      },
    },
  });
});

vi.mock('@/composables/useSelectAssetTools', () => ({
  useSelectAssetTools: () => ({
    sortByBalance: (a: RegisteredAccountAsset, b: RegisteredAccountAsset) => a.symbol.localeCompare(b.symbol),
    getAssetsWithBalances: (addresses: readonly string[], exclude?: string) =>
      stubAssets.filter((asset) => addresses.includes(asset.address) && asset.address !== exclude),
  }),
}));

let BridgeSelectAsset: typeof import('@/components/pages/Bridge/SelectAsset.vue').default;

const factory = (props: Record<string, unknown> = {}) => {
  return mount(BridgeSelectAsset, {
    props: {
      visible: true,
      ...props,
    },
  });
};

describe('BridgeSelectAsset', () => {
  beforeEach(async () => {
    const alpha = {
      address: 'alpha',
      symbol: 'ALP',
      name: 'Alpha Asset',
      balance: { transferable: '10' },
    } as RegisteredAccountAsset;
    const beta = {
      address: 'beta',
      symbol: 'BET',
      name: 'Beta Asset',
      balance: { transferable: '20' },
    } as RegisteredAccountAsset;

    stubAssets.splice(0, stubAssets.length, alpha, beta);

    assetsStoreMock.registeredAssets = {
      alpha: { address: '0xalpha', decimals: 18 },
      beta: { address: '0xbeta', decimals: 18 },
    };
    bridgeStoreMock.isSoraToEvm = true;
    walletStoreMock.shouldBalanceBeHidden = false;
    web3StoreMock.selectedNetworkData = { shortName: 'ETH' };

    ({ default: BridgeSelectAsset } = await import('@/components/pages/Bridge/SelectAsset.vue'));
  });

  it('uses Sora label when bridging from Sora', () => {
    const wrapper = factory();

    expect(wrapper.vm.label).toBe('selectRegisteredAsset.search.networkLabelSora');
  });

  it('uses external network name when bridging to Sora', () => {
    bridgeStoreMock.isSoraToEvm = false;
    const wrapper = factory();

    expect(wrapper.vm.label).toBe('network:ETH');
  });

  it('filters registered assets and omits the currently selected asset', async () => {
    const wrapper = factory({ asset: stubAssets[0] });

    expect(wrapper.vm.filteredAssets).toHaveLength(1);
    expect(wrapper.vm.filteredAssets[0]?.address).toBe('beta');

    wrapper.vm.query = 'beta';
    await nextTick();

    expect(wrapper.vm.filteredAssets).toHaveLength(1);
    expect(wrapper.vm.filteredAssets[0]?.symbol).toBe('BET');
  });
});
