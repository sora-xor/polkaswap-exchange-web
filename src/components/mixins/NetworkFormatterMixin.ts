import { Vue, Component } from 'vue-property-decorator';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { state, getter } from '@/store/decorators';

import type { EvmNetworkData, EvmNetworkId } from '@/consts/evm';

@Component
export default class NetworkFormatterMixin extends Vue {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  @getter.web3.selectedEvmNetwork selectedEvmNetwork!: Nullable<EvmNetworkData>;

  formatNetwork(isSora: boolean): string {
    if (isSora && this.soraNetwork) {
      return `sora.${this.soraNetwork}`;
    }

    return this.selectedEvmNetwork ? `evm.${this.selectedEvmNetwork.id}` : '';
  }

  // TODO [EVM] add network icons
  getEvmIcon(evmNetwork?: EvmNetworkId): string {
    return 'eth';
  }

  // TODO [EVM] check network explorers links
  getEtherscanLink(hash: string): string {
    const explorerUrl = this.selectedEvmNetwork?.blockExplorerUrls?.[0];

    return explorerUrl && hash ? `https://${explorerUrl}/tx/${hash}` : '';
  }
}
