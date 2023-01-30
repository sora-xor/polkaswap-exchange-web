import { Mixins, Component } from 'vue-property-decorator';
import { BridgeNetworks } from '@sora-substrate/util';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { EvmNetworkType } from '@/utils/ethers-util';
import { state, getter } from '@/store/decorators';

import TranslationMixin from './TranslationMixin';

@Component
export default class NetworkFormatterMixin extends Mixins(TranslationMixin) {
  @state.web3.networkType networkType!: Nullable<EvmNetworkType>;
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  @getter.web3.defaultNetworkType defaultNetworkType!: Nullable<EvmNetworkType>;

  formatNetwork(isSora: boolean, isDefaultNetworkType = false): string {
    if (isSora && this.soraNetwork) {
      return this.TranslationConsts.soraNetwork[this.soraNetwork];
    }

    const network = isDefaultNetworkType ? this.defaultNetworkType : this.networkType;

    return network ? this.TranslationConsts.bridgeNetwork[network] : '';
  }

  getEvmIcon(externalNetwork?: BridgeNetworks): string {
    if (externalNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return 'energy';
    }
    return 'eth';
  }

  getEtherscanLink(hash: string, isDefaultNetworkType = false): string {
    const network = isDefaultNetworkType ? this.defaultNetworkType : this.networkType;
    // TODO: Generate the link for Energy Web Chain
    if (!(network && hash) || network === EvmNetworkType.Private) {
      return '';
    }
    return `https://${network !== EvmNetworkType.Mainnet ? network + '.' : ''}etherscan.io/tx/${hash}`;
  }
}
