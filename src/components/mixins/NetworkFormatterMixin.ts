import { Vue, Component } from 'vue-property-decorator'

import store from '@/store'

import { EthNetwork } from '@/utils/web3-util'

@Component
export default class NetworkFormatterMixin extends Vue {
  formatNetwork (isSora: boolean, isDefaultEthNetwork = false): string {
    const defaultEthNetwork = store.getters['web3/defaultEthNetwork']
    const ethNetwork = store.getters['web3/ethNetwork']
    const currentSubNetwork = store.getters['web3/currentSubNetwork']
    const soraNetwork = store.getters.soraNetwork

    if (isSora) {
      return `sora.${soraNetwork}`
    }
    if (currentSubNetwork?.id !== 0) {
      return 'energyweb.title'
    }
    const network = isDefaultEthNetwork ? defaultEthNetwork : ethNetwork
    if (!network || network === 'undefined') {
      return ''
    }
    return `ethereum.${network}`
  }

  getEtherscanLink (hash: string, isDefaultEthNetwork = false): string {
    const defaultEthNetwork = store.getters['web3/defaultEthNetwork']
    const ethNetwork = store.getters['web3/ethNetwork']

    const network = isDefaultEthNetwork ? defaultEthNetwork : ethNetwork
    if (!(network && hash)) {
      return ''
    }
    return `https://${network !== EthNetwork.Mainnet ? network + '.' : ''}etherscan.io/tx/${hash}`
  }
}
