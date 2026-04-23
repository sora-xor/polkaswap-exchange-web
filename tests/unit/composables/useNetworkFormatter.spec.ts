import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmLinkType } from '@/consts/evm';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

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

  it('returns blank network labels when no selected network id is available', async () => {
    web3StoreState.networkSelected = null as any;

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { formatSelectedNetwork, formatNetworkShortName, selectedNetworkName, selectedNetworkShortName } =
      useNetworkFormatter();

    expect(selectedNetworkName.value).toBe('');
    expect(selectedNetworkShortName.value).toBe('');
    expect(formatSelectedNetwork(false)).toBe('');
    expect(formatNetworkShortName(false)).toBe('');
  });

  it('uses empty fallback metadata when the selected network id is unknown', async () => {
    web3StoreState.networkSelected = 999999 as any;

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { selectedNetworkName, selectedNetworkShortName } = useNetworkFormatter();

    expect(selectedNetworkName.value).toBe('');
    expect(selectedNetworkShortName.value).toBe('');
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

  it('maps known EVM and Substrate networks to icon names and falls back to ethereum', async () => {
    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { getNetworkIcon } = useNetworkFormatter();

    expect(getNetworkIcon(0)).toBe('sora');
    expect(getNetworkIcon(EvmNetworkId.BinanceSmartChainMainnet)).toBe('binance-smart-chain');
    expect(getNetworkIcon(EvmNetworkId.PolygonMainnet)).toBe('polygon');
    expect(getNetworkIcon(EvmNetworkId.KlaytnTestnetBaobab)).toBe('klaytn');
    expect(getNetworkIcon(EvmNetworkId.AvalancheTestnetFuji)).toBe('avalanche');
    expect(getNetworkIcon(EvmNetworkId.EthereumClassicTestnetMordor)).toBe('ethereum-classic');
    expect(getNetworkIcon(SubNetworkId.Polkadot)).toBe('polkadot');
    expect(getNetworkIcon(SubNetworkId.PolkadotSora)).toBe('sora-polkadot');
    expect(getNetworkIcon(SubNetworkId.PolkadotAcala)).toBe('acala');
    expect(getNetworkIcon(SubNetworkId.PolkadotAstar)).toBe('astar');
    expect(getNetworkIcon(SubNetworkId.PolkadotMoonbeam)).toBe('moonbeam');
    expect(getNetworkIcon(SubNetworkId.Kusama)).toBe('kusama');
    expect(getNetworkIcon(SubNetworkId.KusamaCurio)).toBe('curio');
    expect(getNetworkIcon(SubNetworkId.KusamaShiden)).toBe('shiden');
    expect(getNetworkIcon(SubNetworkId.Rococo)).toBe('rococo');
    expect(getNetworkIcon(SubNetworkId.RococoSora)).toBe('sora-rococo');
    expect(getNetworkIcon(SubNetworkId.KusamaSora)).toBe('sora-kusama');
    expect(getNetworkIcon(SubNetworkId.Liberland)).toBe('liberland');
    expect(getNetworkIcon(SubNetworkId.Alphanet)).toBe('alphanet');
    expect(getNetworkIcon(SubNetworkId.AlphanetSora)).toBe('sora-alphanet');
    expect(getNetworkIcon(SubNetworkId.AlphanetMoonbase)).toBe('moonbase');
    expect(getNetworkIcon()).toBe('ethereum');
    expect(getNetworkIcon(999999)).toBe('ethereum');
  });

  it('formats network names and reports missing explorer metadata safely', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
      const { getNetworkExplorerLinks, getNetworkName } = useNetworkFormatter();

      expect(getNetworkName(null, EvmNetworkId.EthereumMainnet)).toBe('');
      expect(getNetworkName(BridgeNetworkType.Eth, null)).toBe('');
      expect(getNetworkName(BridgeNetworkType.Eth, EvmNetworkId.PolygonMainnet)).toBe('Matic');
      expect(getNetworkName(BridgeNetworkType.Sub, SubNetworkId.KusamaSora)).toBe('SORA KSM');
      expect(getNetworkName(BridgeNetworkType.Evm, 999999)).toBe('');

      expect(
        getNetworkExplorerLinks({
          networkType: BridgeNetworkType.Evm,
          networkId: EvmNetworkId.PolygonMainnet,
          value: '0xabc',
        })
      ).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith(`Network data for "${EvmNetworkId.PolygonMainnet}" is not defined`);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('builds EVM transaction and account explorer links from safe network metadata', async () => {
    web3StoreState.availableNetworks = {
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {
        [EvmNetworkId.PolygonMainnet]: {
          data: {
            blockExplorerUrls: ['https://polygonscan.com'],
            nodes: [],
          },
        },
      },
      [BridgeNetworkType.Sub]: {},
    };

    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { getNetworkExplorerLinks } = useNetworkFormatter();

    expect(
      getNetworkExplorerLinks({
        networkType: BridgeNetworkType.Evm,
        networkId: EvmNetworkId.PolygonMainnet,
        value: '0xhash',
      })
    ).toEqual([{ type: 'etherscan', value: 'https://polygonscan.com/tx/0xhash' }]);
    expect(
      getNetworkExplorerLinks({
        networkType: BridgeNetworkType.Evm,
        networkId: EvmNetworkId.PolygonMainnet,
        value: '0xaccount',
        type: EvmLinkType.Account,
      })
    ).toEqual([{ type: 'etherscan', value: 'https://polygonscan.com/address/0xaccount' }]);
    expect(
      getNetworkExplorerLinks({
        networkType: BridgeNetworkType.Evm,
        networkId: EvmNetworkId.PolygonMainnet,
      })
    ).toEqual([]);
  });

  it('classifies bridge transaction states and formats timestamps', async () => {
    const { useNetworkFormatter } = await import('@/composables/useNetworkFormatter');
    const { formatDatetime, isFailedState, isOutgoingTx, isSuccessState, isWaitingForActionState } =
      useNetworkFormatter();

    expect(isOutgoingTx(null)).toBe(false);
    expect(isWaitingForActionState(null)).toBe(false);
    expect(isFailedState(null)).toBe(false);
    expect(isFailedState({ transactionState: ETH_BRIDGE_STATES.EVM_REJECTED } as any)).toBe(true);
    expect(isFailedState({ transactionState: ETH_BRIDGE_STATES.SORA_REJECTED } as any)).toBe(true);
    expect(isFailedState({ transactionState: BridgeTxStatus.Failed } as any)).toBe(true);
    expect(isFailedState({ transactionState: BridgeTxStatus.Pending } as any)).toBe(false);

    expect(isSuccessState(null)).toBe(false);
    expect(isSuccessState({ transactionState: BridgeTxStatus.Done } as any)).toBe(true);
    expect(isSuccessState({ transactionState: ETH_BRIDGE_STATES.SORA_COMMITED } as any)).toBe(true);
    expect(isSuccessState({ transactionState: BridgeTxStatus.Pending } as any)).toBe(false);
    expect(formatDatetime({ startTime: 12345 } as any)).toBe('12345');
  });
});
