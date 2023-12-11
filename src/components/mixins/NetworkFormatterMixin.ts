import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/util/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { EvmLinkType, EVM_NETWORKS } from '@/consts/evm';
import { SUB_NETWORKS } from '@/consts/sub';
import { state, getter } from '@/store/decorators';
import type { AvailableNetwork } from '@/store/web3/types';
import type { NetworkData } from '@/types/bridge';

import TranslationMixin from './TranslationMixin';

import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

@Component
export default class NetworkFormatterMixin extends Mixins(TranslationMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @getter.web3.selectedNetwork selectedNetwork!: Nullable<NetworkData>;
  @getter.web3.availableNetworks availableNetworks!: Record<
    BridgeNetworkType,
    Partial<Record<BridgeNetworkId, AvailableNetwork>>
  >;

  readonly EvmLinkType = EvmLinkType;

  formatSelectedNetwork(isSora: boolean): string {
    if (isSora && this.soraNetwork) {
      return this.TranslationConsts.soraNetwork[this.soraNetwork];
    }

    return this.selectedNetwork?.name ?? '';
  }

  formatNetworkShortName(isSora: boolean): string {
    if (isSora) {
      return this.TranslationConsts.Sora;
    }

    return this.selectedNetwork?.shortName ?? '';
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
      case SubNetworkId.Kusama:
        return 'kusama';
      case SubNetworkId.Rococo:
        return 'rococo';
      case SubNetworkId.RococoSora:
        return 'sora-rococo';
      case SubNetworkId.KusamaSora:
        return 'sora-kusama';
      default:
        return 'ethereum';
    }
  }

  getNetworkExplorerLinks(
    networkType: BridgeNetworkType,
    networkId: BridgeNetworkId,
    value: string,
    blockHash = '',
    type = EvmLinkType.Transaction
  ) {
    if (!value) return [];

    const networkData = this.availableNetworks[networkType][networkId]?.data;

    if (!networkData) {
      console.error(`Network data for "${networkId}" is not defined"`);
      return [];
    }

    const explorerUrl = networkData.blockExplorerUrls[0];

    if (!explorerUrl) {
      console.error(`"blockExplorerUrls" is not provided for network id "${networkId}"`);
      return [];
    }

    if (networkType === BridgeNetworkType.Sub) {
      if (type === EvmLinkType.Account) return [];

      if (!blockHash) return [];

      const baseLink = `https://polkadot.js.org/apps/?rpc=${explorerUrl}#/explorer/query`;

      return [
        {
          type: WALLET_CONSTS.ExplorerType.Polkadot,
          value: `${baseLink}/${blockHash}`,
        },
      ];
    } else {
      const path = type === EvmLinkType.Transaction ? 'tx' : 'address';

      return [
        {
          type: this.TranslationConsts.Etherscan as WALLET_CONSTS.ExplorerType,
          value: `${explorerUrl}/${path}/${value}`,
        },
      ];
    }
  }
}
