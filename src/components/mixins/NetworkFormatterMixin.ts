import { Vue, Component } from 'vue-property-decorator';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

import { state, getter } from '@/store/decorators';

import { EvmLinkType, EVM_NETWORKS } from '@/consts/evm';
import type { EvmNetworkData } from '@/consts/evm';

@Component
export default class NetworkFormatterMixin extends Vue {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @getter.web3.connectedEvmNetwork connectedEvmNetwork!: Nullable<EvmNetworkData>;

  readonly EvmLinkType = EvmLinkType;

  formatNetwork(isSora: boolean): string {
    if (isSora && this.soraNetwork) {
      return `sora.${this.soraNetwork}`;
    }

    return this.connectedEvmNetwork ? `evm.${this.connectedEvmNetwork.id}` : '';
  }

  // TODO [EVM] add network icons
  getEvmIcon(evmNetwork?: EvmNetwork): string {
    return 'eth';
  }

  // TODO [EVM] check network explorers links
  getEvmExplorerLink(hash: string, type: EvmLinkType, networkId: EvmNetwork): string {
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
