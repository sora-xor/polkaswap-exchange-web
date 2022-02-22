import { Vue, Component } from 'vue-property-decorator';
import { Getter, State } from 'vuex-class';
import { BridgeNetworks } from '@sora-substrate/util';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { EvmNetworkType } from '@/utils/ethers-util';

@Component
export default class NetworkFormatterMixin extends Vue {
  @State((state) => state.web3.networkType) networkType!: EvmNetworkType;

  @Getter soraNetwork!: WALLET_CONSTS.SoraNetwork;
  @Getter('defaultNetworkType', { namespace: 'web3' }) defaultNetworkType!: EvmNetworkType;

  formatNetwork(isSora: boolean, isDefaultNetworkType = false): string {
    if (isSora) {
      return `sora.${this.soraNetwork}`;
    }

    const network = isDefaultNetworkType ? this.defaultNetworkType : this.networkType;

    return network ? `evm.${network}` : '';
  }

  getEvmIcon(externalNetwork: BridgeNetworks): string {
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
