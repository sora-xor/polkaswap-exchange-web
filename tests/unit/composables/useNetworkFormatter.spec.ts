import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmLinkType } from '@/consts/evm';

const web3GetterState = reactive({
  selectedNetwork: null as { name?: string; shortName?: string } | null,
  networkType: BridgeNetworkType.Eth,
  networkSelected: EvmNetworkId.EthereumMainnet,
  availableNetworks: {
    [BridgeNetworkType.Eth]: {},
    [BridgeNetworkType.Evm]: {},
    [BridgeNetworkType.Sub]: {},
  },
});

vi.mock('@/store', () => ({
  default: {
    getters: {
      web3: web3GetterState,
    },
  },
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

vi.mock('@/utils/walletCore', () => ({
  loadWalletCore: async () => ({
    WALLET_CONSTS: {
      SoraNetwork: {},
      ExplorerType: {
        Subscan: 'subscan',
        Polkadot: 'polkadot',
      },
      ETH_BRIDGE_STATES: {
        EVM_REJECTED: 'EVM_REJECTED',
        SORA_REJECTED: 'SORA_REJECTED',
        EVM_COMMITED: 'EVM_COMMITED',
        SORA_COMMITED: 'SORA_COMMITED',
      },
    },
  }),
}));

describe('useNetworkFormatter', () => {
  beforeEach(() => {
    web3GetterState.selectedNetwork = null;
    web3GetterState.networkType = BridgeNetworkType.Eth;
    web3GetterState.networkSelected = EvmNetworkId.EthereumMainnet;
    web3GetterState.availableNetworks = {
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
    web3GetterState.selectedNetwork = {
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
    web3GetterState.networkType = BridgeNetworkType.Sub;
    web3GetterState.networkSelected = SubNetworkId.Polkadot;

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { formatSelectedNetwork, formatNetworkShortName, selectedNetworkName } = useNetworkFormatter();

    expect(selectedNetworkName.value).toBe('Polkadot');
    expect(formatSelectedNetwork(false)).toBe('Polkadot');
    expect(formatNetworkShortName(false)).toBe('Polkadot');
  });

  it('drops explorer links when network metadata contains unsafe URLs', async () => {
    web3GetterState.availableNetworks = {
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
    web3GetterState.availableNetworks = {
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
  });
});
