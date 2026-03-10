import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    },
  }),
}));

describe('useNetworkFormatter', () => {
  beforeEach(() => {
    web3GetterState.selectedNetwork = null;
    web3GetterState.networkType = BridgeNetworkType.Eth;
    web3GetterState.networkSelected = EvmNetworkId.EthereumMainnet;
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
});
