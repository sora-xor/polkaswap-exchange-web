import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/util/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { EvmLinkType, EVM_NETWORKS } from '@/consts/evm';
import { SUB_NETWORKS } from '@/consts/sub';
import { state, getter } from '@/store/decorators';
import type { AvailableNetwork } from '@/store/web3/types';
import type { NetworkData } from '@/types/bridge';
import { getSubstrateExplorerLinks } from '@/utils';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';
import { isUnsignedToPart } from '@/utils/bridge/eth/utils';

import TranslationMixin from './TranslationMixin';

import type { IBridgeTransaction } from '@sora-substrate/util';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

const getSubNetworkLinks = (
  networkData: NetworkData,
  type: EvmLinkType,
  value?: string, // tx hash or account address
  blockId?: number | string,
  eventIndex?: number
): WALLET_CONSTS.ExplorerLink[] => {
  const baseLinks: WALLET_CONSTS.ExplorerLink[] = [];

  const subscanLink = networkData.blockExplorerUrls[0];
  const polkadotUrl = networkData.nodes?.[0].address;
  const polkadotLink = polkadotUrl
    ? `https://polkadot.js.org/apps/?rpc=${networkData.nodes?.[0].address}#/explorer/query`
    : '';

  if (subscanLink) {
    baseLinks.push({
      type: WALLET_CONSTS.ExplorerType.Subscan,
      value: subscanLink,
    });
  }
  if (polkadotLink) {
    baseLinks.push({
      type: WALLET_CONSTS.ExplorerType.Polkadot,
      value: polkadotLink,
    });
  }

  return getSubstrateExplorerLinks(baseLinks, type === EvmLinkType.Account, value, blockId, eventIndex);
};

const getEvmNetworkLinks = (
  networkData: NetworkData,
  type: EvmLinkType,
  value?: string
): WALLET_CONSTS.ExplorerLink[] => {
  const links: Array<WALLET_CONSTS.ExplorerLink> = [];
  const explorerUrl = networkData.blockExplorerUrls[0];

  if (explorerUrl && value) {
    const path = type === EvmLinkType.Transaction ? 'tx' : 'address';
    const etherscanLink = {
      type: 'etherscan' as WALLET_CONSTS.ExplorerType,
      value: `${explorerUrl}/${path}/${value}`,
    };

    links.push(etherscanLink);
  }

  return links;
};

@Component
export default class NetworkFormatterMixin extends Mixins(TranslationMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @getter.web3.selectedNetwork selectedNetwork!: Nullable<NetworkData>;
  @getter.web3.availableNetworks availableNetworks!: Record<
    BridgeNetworkType,
    Partial<Record<BridgeNetworkId, AvailableNetwork>>
  >;

  readonly EvmLinkType = EvmLinkType;

  get selectedNetworkName(): string {
    return this.selectedNetwork?.name ?? '';
  }

  get selectedNetworkShortName(): string {
    return this.selectedNetwork?.shortName ?? '';
  }

  formatSelectedNetwork(isSora: boolean): string {
    if (isSora && this.soraNetwork) {
      return this.TranslationConsts.soraNetwork[this.soraNetwork];
    }

    return this.selectedNetworkName;
  }

  formatNetworkShortName(isSora: boolean): string {
    if (isSora) {
      return this.TranslationConsts.Sora;
    }

    return this.selectedNetworkShortName;
  }

  getNetworkName(type: Nullable<BridgeNetworkType>, id: Nullable<BridgeNetworkId>): string {
    if (!(type && id)) return '';

    const networks = type === BridgeNetworkType.Sub ? SUB_NETWORKS : EVM_NETWORKS;

    return networks[id]?.shortName ?? '';
  }

  getNetworkIcon(network?: Nullable<BridgeNetworkId>): string {
    switch (network) {
      // special case
      case 0:
        return 'sora';
      // evm
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
      // sub
      case SubNetworkId.Polkadot:
        return 'polkadot';
      case SubNetworkId.PolkadotSora:
        return 'sora-polkadot';
      case SubNetworkId.PolkadotAcala:
        return 'acala';
      case SubNetworkId.Kusama:
        return 'kusama';
      case SubNetworkId.Rococo:
        return 'rococo';
      case SubNetworkId.RococoSora:
        return 'sora-rococo';
      case SubNetworkId.KusamaSora:
        return 'sora-kusama';
      case SubNetworkId.Liberland:
        return 'liberland';
      case SubNetworkId.AlphanetMoonbase:
        return 'moonbase';
      default:
        return 'ethereum';
    }
  }

  getNetworkExplorerLinks(
    networkType: BridgeNetworkType,
    networkId: BridgeNetworkId,
    value?: string,
    blockId?: number | string,
    eventIndex?: number,
    type = EvmLinkType.Transaction
  ): Array<WALLET_CONSTS.ExplorerLink> {
    const networkData = this.availableNetworks[networkType][networkId]?.data;

    if (!networkData) {
      console.error(`Network data for "${networkId}" is not defined"`);
      return [];
    }

    return networkType === BridgeNetworkType.Sub
      ? getSubNetworkLinks(networkData, type, value, blockId, eventIndex)
      : getEvmNetworkLinks(networkData, type, value);
  }

  isOutgoingTx(item: Nullable<IBridgeTransaction>): boolean {
    return isOutgoingTransaction(item);
  }

  isFailedState(item: Nullable<IBridgeTransaction>): boolean {
    if (!item?.transactionState) return false;
    // ETH
    if (
      [ETH_BRIDGE_STATES.EVM_REJECTED as string, ETH_BRIDGE_STATES.SORA_REJECTED as string].includes(
        item.transactionState
      )
    )
      return true;
    // EVM
    if (item.transactionState === BridgeTxStatus.Failed) return true;
    // OTHER
    return false;
  }

  isSuccessState(item: Nullable<IBridgeTransaction>): boolean {
    if (!item) return false;
    // ETH
    if (
      item.transactionState ===
      (this.isOutgoingTx(item) ? ETH_BRIDGE_STATES.EVM_COMMITED : ETH_BRIDGE_STATES.SORA_COMMITED)
    )
      return true;
    // EVM
    if (item.transactionState === BridgeTxStatus.Done) return true;
    // OTHER
    return false;
  }

  isWaitingForAction(item: Nullable<IBridgeTransaction>): boolean {
    if (!item) return false;
    // ETH
    return item.transactionState === ETH_BRIDGE_STATES.EVM_REJECTED && isUnsignedToPart(item);
  }

  formatDatetime(item: Nullable<IBridgeTransaction>): string {
    return this.formatDate(item?.startTime ?? Date.now());
  }
}
