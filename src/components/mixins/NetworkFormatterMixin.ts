import { Vue, Component } from 'vue-property-decorator'

import store from '@/store'

import { EvmNetworkType } from '@/utils/web3-util'

@Component
export default class NetworkFormatterMixin extends Vue {
  formatNetwork (isSora: boolean, isDefaultNetworkType = false): string {
    if (isSora) {
      return `sora.${store.getters.soraNetwork}`
    }

    const network = store.getters[`web3/${isDefaultNetworkType ? 'defaultNetworkType' : 'networkType'}`]
    if (!network) {
      return ''
    }

    return `evm.${network}`
  }

  getEtherscanLink (hash: string, isDefaultNetworkType = false): string {
    const defaultNetworkType = store.getters['web3/defaultNetworkType']
    const networkType = store.getters['web3/networkType']

    const network = isDefaultNetworkType ? defaultNetworkType : networkType
    // TODO: Generate the link for Energy Web Chain
    if (!(network && hash) || network === EvmNetworkType.Private) {
      return ''
    }
    return `https://${network !== EvmNetworkType.Mainnet ? network + '.' : ''}etherscan.io/tx/${hash}`
  }
}
