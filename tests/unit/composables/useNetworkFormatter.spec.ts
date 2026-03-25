import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmLinkType } from '@/consts/evm';

const web3StoreState = reactive({
  selectedNetworkData: null as { name?: string; shortName?: string } | null,
  networkType: BridgeNetworkType.Eth,
  networkSelected: EvmNetworkId.EthereumMainnet,
  availableNetworks: {
    [BridgeNetworkType.Eth]: {},
    [BridgeNetworkType.Evm]: {},
    [BridgeNetworkType.Sub]: {},
  },
});

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => web3StoreState,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    soraNetwork: null,
    networkFees: {},
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    formatDate: (value: unknown) => String(value ?? ''),
    TranslationConsts: {
      Sora: 'SORA',
      soraNetwork: {},
      SoraNetwork: {},
    },
  }),
}));

describe('useNetworkFormatter', () => {
  beforeEach(() => {
    web3StoreState.selectedNetworkData = null;
    web3StoreState.networkType = BridgeNetworkType.Eth;
    web3StoreState.networkSelected = EvmNetworkId.EthereumMainnet;
    web3StoreState.availableNetworks = {
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: {},
    };
  });

  it('falls back to static EVM network metadata when selectedNetwork is not hydrated', async () => {
    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { formatSelectedNetwork, formatNetworkShortName, selectedNetworkName } = useNetworkFormatter();

    expect(selectedNetworkName.value).toBe('Ethereum Mainnet');
    expect(formatSelectedNetwork(false)).toBe('Ethereum Mainnet');
    expect(formatNetworkShortName(false)).toBe('Ethereum');
  });

  it('prefers selected network metadata when available', async () => {
    web3StoreState.selectedNetworkData = {
      name: 'Custom Mainnet',
      shortName: 'Custom',
    };

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { formatSelectedNetwork, formatNetworkShortName, selectedNetworkName } = useNetworkFormatter();

    expect(selectedNetworkName.value).toBe('Custom Mainnet');
    expect(formatSelectedNetwork(false)).toBe('Custom Mainnet');
    expect(formatNetworkShortName(false)).toBe('Custom');
  });

  it('falls back to static Sub network metadata when selectedNetwork is not hydrated', async () => {
    web3StoreState.networkType = BridgeNetworkType.Sub;
    web3StoreState.networkSelected = SubNetworkId.Polkadot;

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { formatSelectedNetwork, formatNetworkShortName, selectedNetworkName } = useNetworkFormatter();

    expect(selectedNetworkName.value).toBe('Polkadot');
    expect(formatSelectedNetwork(false)).toBe('Polkadot');
    expect(formatNetworkShortName(false)).toBe('Polkadot');
  });

  it('drops explorer links when network metadata contains unsafe URLs', async () => {
    web3StoreState.availableNetworks = {
      [BridgeNetworkType.Eth]: {
        [EvmNetworkId.EthereumMainnet]: {
          data: {
            blockExplorerUrls: ['javascript:alert(1)'],
            nodes: [],
          },
        },
      },
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: {},
    };

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { getNetworkExplorerLinks } = useNetworkFormatter();

    expect(
      getNetworkExplorerLinks({
        networkType: BridgeNetworkType.Eth,
        networkId: EvmNetworkId.EthereumMainnet,
        value: '0x123',
        type: EvmLinkType.Transaction,
      })
    ).toEqual([]);
  });

  it('encodes node rpc URLs when constructing polkadot.js explorer links', async () => {
    web3StoreState.availableNetworks = {
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: {
        [SubNetworkId.Polkadot]: {
          data: {
            blockExplorerUrls: ['https://subscan.io'],
            nodes: [{ address: 'wss://node.example/?x=1&y=2' }],
          },
        },
      },
    };

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { getNetworkExplorerLinks } = useNetworkFormatter();

    const links = getNetworkExplorerLinks({
      networkType: BridgeNetworkType.Sub,
      networkId: SubNetworkId.Polkadot,
      value: '0x123',
      blockId: 12345,
      type: EvmLinkType.Transaction,
    });

    const polkadotLink = links.find((item) => item.value?.includes('polkadot.js.org/apps/'))?.value ?? '';
    expect(polkadotLink).toContain('rpc=wss%3A%2F%2Fnode.example%2F%3Fx%3D1%26y%3D2');
    expect(links.some((item) => item.value?.includes('subscan.io'))).toBe(false);
  });
});
