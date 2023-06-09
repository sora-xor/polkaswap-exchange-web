import { EvmNetworkId } from '@sora-substrate/util/build/bridgeProxy/evm/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { EvmLinkType, EVM_NETWORKS } from '@/consts/evm';
import { state, getter } from '@/store/decorators';
import type { NetworkData } from '@/types/bridge';

import TranslationMixin from './TranslationMixin';

import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

@Component
export default class NetworkFormatterMixin extends Mixins(TranslationMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @getter.web3.providedNetwork providedNetwork!: Nullable<NetworkData>;

  readonly EvmLinkType = EvmLinkType;

  formatNetwork(isSora: boolean): string {
    if (isSora && this.soraNetwork) {
      return this.TranslationConsts.soraNetwork[this.soraNetwork];
    }

    return this.providedNetwork?.name ?? '';
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
      case SubNetwork.Polkadot:
        return 'polkadot';
      case SubNetwork.Kusama:
        return 'kusama';
      case SubNetwork.Rococo:
        return 'rococo';
      case SubNetwork.Karura:
        return 'karura';
      default:
        return 'ethereum';
    }
  }

  // TODO [EVM] check network explorers links
  getEvmExplorerLink(hash: string, type: EvmLinkType, networkId: BridgeNetworkId): string {
    if (!hash) return '';

    const network = EVM_NETWORKS[networkId];

    if (!network) {
      console.error(`Network id "${networkId}" is not defined in "EVM_NETWORKS"`);
      return '';
    }

    const explorerUrl = network.blockExplorerUrls[0];

    if (!explorerUrl) {
      console.error(`"blockExplorerUrls" is not provided for EVM network id "${networkId}"`);
      return '';
    }

    const path = type === EvmLinkType.Transaction ? 'tx' : 'address';

    return `${explorerUrl}/${path}/${hash}`;
  }
}
