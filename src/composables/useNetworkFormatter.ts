import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { EVM_NETWORKS, EvmLinkType } from '@/consts/evm';
import { SUB_NETWORKS } from '@/consts/sub';
import store from '@/store';
import type { AvailableNetwork } from '@/store/web3/types';
import { useSettingsStore } from '@/stores/settings';
import type { NetworkData } from '@/types/bridge';
import type { Nullable } from '@/types/common';
import { getSubstrateExplorerLinks } from '@/utils';
import { isOutgoingTransaction, isWaitingForAction } from '@/utils/bridge/common/utils';

import type { IBridgeTransaction, NetworkFeesObject } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import { loadWalletCore } from '@/utils/walletCore';
const { WALLET_CONSTS } = await loadWalletCore();

type ExplorerLinksParams = {
  networkType: BridgeNetworkType;
  networkId: BridgeNetworkId;
  value?: string;
  blockId?: number | string;
  eventIndex?: number;
  type?: EvmLinkType;
};

function buildSubNetworkLinks(
  networkData: NetworkData,
  type: EvmLinkType,
  value?: string,
  blockId?: number | string,
  eventIndex?: number
): WALLET_CONSTS.ExplorerLink[] {
  const baseLinks: WALLET_CONSTS.ExplorerLink[] = [];
  const subscanLink = networkData.blockExplorerUrls[0];
  const polkadotUrl = networkData.nodes?.[0].address;
  const polkadotLink = polkadotUrl ? `https://polkadot.js.org/apps/?rpc=${polkadotUrl}#/explorer/query` : '';

  if (subscanLink) {
    baseLinks.push({ type: WALLET_CONSTS.ExplorerType.Subscan, value: subscanLink });
  }

  if (polkadotLink) {
    baseLinks.push({ type: WALLET_CONSTS.ExplorerType.Polkadot, value: polkadotLink });
  }

  return getSubstrateExplorerLinks(baseLinks, type === EvmLinkType.Account, value, blockId, eventIndex);
}

function buildEvmNetworkLinks(
  networkData: NetworkData,
  type: EvmLinkType,
  value?: string
): WALLET_CONSTS.ExplorerLink[] {
  const explorerUrl = networkData.blockExplorerUrls[0];

  if (!explorerUrl || !value) {
    return [];
  }

  const path = type === EvmLinkType.Transaction ? 'tx' : 'address';
  return [
    {
      type: 'etherscan' as WALLET_CONSTS.ExplorerType,
      value: `${explorerUrl}/${path}/${value}`,
    },
  ];
}

/**
 * Provides the bridge-related formatting helpers formerly provided by
 * `NetworkFormatterMixin`.
 */
export function useNetworkFormatter() {
  const { t, TranslationConsts, formatDate } = useTranslation();
  const settingsStore = useSettingsStore();

  const soraNetwork = computed(() => settingsStore.soraNetwork as Nullable<WALLET_CONSTS.SoraNetwork>);
  const networkType = computed(
    () => (store.getters.web3.networkType ?? store.state.web3?.networkType) as Nullable<BridgeNetworkType>
  );
  const networkSelected = computed(
    () => (store.getters.web3.networkSelected ?? store.state.web3?.networkSelected) as Nullable<BridgeNetworkId>
  );
  const selectedNetwork = computed(() => store.getters.web3.selectedNetwork as Nullable<NetworkData>);
  const selectedNetworkFallbackData = computed<Nullable<NetworkData>>(() => {
    if (selectedNetwork.value) return selectedNetwork.value;
    if (!networkType.value || networkSelected.value === null || networkSelected.value === undefined) return null;

    const networks = networkType.value === BridgeNetworkType.Sub ? SUB_NETWORKS : EVM_NETWORKS;
    return networks[networkSelected.value] ?? null;
  });
  const availableNetworks = computed(
    () =>
      store.getters.web3.availableNetworks as Record<
        BridgeNetworkType,
        Partial<Record<BridgeNetworkId, AvailableNetwork>>
      >
  );
  const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);

  const selectedNetworkName = computed(() => selectedNetworkFallbackData.value?.name ?? '');
  const selectedNetworkShortName = computed(() => selectedNetworkFallbackData.value?.shortName ?? '');

  const formatSelectedNetwork = (isSora: boolean): string => {
    if (isSora && soraNetwork.value) {
      return TranslationConsts.soraNetwork[soraNetwork.value];
    }

    return selectedNetworkName.value;
  };

  const formatNetworkShortName = (isSora: boolean): string =>
    isSora ? TranslationConsts.Sora : selectedNetworkShortName.value;

  const getNetworkName = (networkType: Nullable<BridgeNetworkType>, networkId: Nullable<BridgeNetworkId>): string => {
    if (!networkType || !networkId) return '';
    const networks = networkType === BridgeNetworkType.Sub ? SUB_NETWORKS : EVM_NETWORKS;
    return networks[networkId]?.shortName ?? '';
  };

  const getNetworkIcon = (network?: Nullable<BridgeNetworkId>): string => {
    switch (network) {
      case 0:
        return 'sora';
      case EvmNetworkId.BinanceSmartChainMainnet:
      case EvmNetworkId.BinanceSmartChainTestnet:
        return 'binance-smart-chain';
      case EvmNetworkId.PolygonMainnet:
      case EvmNetworkId.PolygonTestnetMumbai:
        return 'polygon';
      case EvmNetworkId.KlaytnMainnet:
      case EvmNetworkId.KlaytnTestnetBaobab:
        return 'klaytn';
      case EvmNetworkId.AvalancheMainnet:
      case EvmNetworkId.AvalancheTestnetFuji:
        return 'avalanche';
      case EvmNetworkId.EthereumClassicMainnet:
      case EvmNetworkId.EthereumClassicTestnetMordor:
        return 'ethereum-classic';
      case SubNetworkId.Polkadot:
        return 'polkadot';
      case SubNetworkId.PolkadotSora:
        return 'sora-polkadot';
      case SubNetworkId.PolkadotAcala:
        return 'acala';
      case SubNetworkId.PolkadotAstar:
        return 'astar';
      case SubNetworkId.PolkadotMoonbeam:
        return 'moonbeam';
      case SubNetworkId.Kusama:
        return 'kusama';
      case SubNetworkId.KusamaCurio:
        return 'curio';
      case SubNetworkId.KusamaShiden:
        return 'shiden';
      case SubNetworkId.Rococo:
        return 'rococo';
      case SubNetworkId.RococoSora:
        return 'sora-rococo';
      case SubNetworkId.KusamaSora:
        return 'sora-kusama';
      case SubNetworkId.Liberland:
        return 'liberland';
      case SubNetworkId.Alphanet:
        return 'alphanet';
      case SubNetworkId.AlphanetSora:
        return 'sora-alphanet';
      case SubNetworkId.AlphanetMoonbase:
        return 'moonbase';
      default:
        return 'ethereum';
    }
  };

  const getNetworkExplorerLinks = ({
    networkType,
    networkId,
    value,
    blockId,
    eventIndex,
    type = EvmLinkType.Transaction,
  }: ExplorerLinksParams): Array<WALLET_CONSTS.ExplorerLink> => {
    const networkMeta = availableNetworks.value[networkType]?.[networkId];
    const networkData = networkMeta?.data;

    if (!networkData) {
      console.error(`Network data for "${networkId}" is not defined`);
      return [];
    }

    return networkType === BridgeNetworkType.Sub
      ? buildSubNetworkLinks(networkData, type, value, blockId, eventIndex)
      : buildEvmNetworkLinks(networkData, type, value);
  };

  const isOutgoingTx = (item: Nullable<IBridgeTransaction>): boolean => isOutgoingTransaction(item);

  const isFailedState = (item: Nullable<IBridgeTransaction>): boolean => {
    if (!item?.transactionState) return false;

    if (
      [WALLET_CONSTS.ETH_BRIDGE_STATES.EVM_REJECTED, WALLET_CONSTS.ETH_BRIDGE_STATES.SORA_REJECTED].includes(
        item.transactionState
      )
    ) {
      return true;
    }

    if (item.transactionState === BridgeTxStatus.Failed) return true;

    return false;
  };

  const isSuccessState = (item: Nullable<IBridgeTransaction>): boolean => {
    if (!item) return false;

    if (
      item.transactionState ===
      (isOutgoingTx(item)
        ? WALLET_CONSTS.ETH_BRIDGE_STATES.EVM_COMMITED
        : WALLET_CONSTS.ETH_BRIDGE_STATES.SORA_COMMITED)
    ) {
      return true;
    }

    if (item.transactionState === BridgeTxStatus.Done) return true;

    return false;
  };

  const isWaitingForActionState = (item: Nullable<IBridgeTransaction>): boolean => isWaitingForAction(item);

  const formatDatetime = (item: Nullable<IBridgeTransaction>): string => formatDate(item?.startTime ?? Date.now());

  return {
    t,
    TranslationConsts,
    networkFees,
    selectedNetwork,
    soraNetwork,
    selectedNetworkName,
    selectedNetworkShortName,
    formatSelectedNetwork,
    formatNetworkShortName,
    getNetworkName,
    getNetworkIcon,
    getNetworkExplorerLinks,
    isOutgoingTx,
    isFailedState,
    isSuccessState,
    isWaitingForActionState,
    formatDatetime,
  };
}

export type NetworkFormatterComposable = ReturnType<typeof useNetworkFormatter>;
