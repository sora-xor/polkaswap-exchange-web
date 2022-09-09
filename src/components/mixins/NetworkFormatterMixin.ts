import { Vue, Component } from 'vue-property-decorator';
import { BridgeNetworks } from '@sora-substrate/util';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { state, getter } from '@/store/decorators';

import type { EvmNetworkData } from '@/consts/evm';

@Component
export default class NetworkFormatterMixin extends Vue {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  @getter.web3.connectedEvmNetwork connectedEvmNetwork!: Nullable<EvmNetworkData>;

  formatNetwork(isSora: boolean): string {
    if (isSora && this.soraNetwork) {
      return `sora.${this.soraNetwork}`;
    }

    return this.connectedEvmNetwork ? `evm.${this.connectedEvmNetwork.id}` : '';
  }

  getEvmIcon(externalNetwork?: BridgeNetworks): string {
    if (externalNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return 'energy';
    }
    return 'eth';
  }

  // TODO [EVM] check network explorers links
  getEtherscanLink(hash: string): string {
    const explorerUrl = this.connectedEvmNetwork?.blockExplorerUrls?.[0];

    return explorerUrl && hash ? `https://${explorerUrl}/tx/${hash}` : '';
  }
}
