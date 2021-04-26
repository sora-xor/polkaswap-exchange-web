import { Vue, Component } from 'vue-property-decorator'

import store from '@/store'

import { EvmNetwork } from '@/utils/web3-util'

@Component
export default class NetworkFormatterMixin extends Vue {
  formatNetwork (isSora: boolean, isDefaultEthNetwork = false): string {
    if (isSora) return `sora.${store.getters.soraNetwork}`
    // TODO: Get network title from history instead of default value
    const defaultEthNetwork = store.getters['web3/defaultEthNetwork']
    if (isDefaultEthNetwork) return `evm.${defaultEthNetwork}`

    const evmNetwork = store.getters['web3/evmNetwork']
    if (evmNetwork === EvmNetwork.Energy) {
      return `evm.${evmNetwork}`
    }

    const ethNetwork = store.getters['web3/ethNetwork']
    if (!ethNetwork || ethNetwork === 'undefined') {
      return ''
    }
    return `evm.${ethNetwork === EvmNetwork.Energy ? defaultEthNetwork : ethNetwork}`
  }

  getEtherscanLink (hash: string, isDefaultEthNetwork = false): string {
    const defaultEthNetwork = store.getters['web3/defaultEthNetwork']
    const ethNetwork = store.getters['web3/ethNetwork']

    const network = isDefaultEthNetwork ? defaultEthNetwork : ethNetwork
    // TODO: Generate the link for Energy Web Chain
    if (!(network && hash) || network === EvmNetwork.Energy) {
      return ''
    }
    return `https://${network !== EvmNetwork.Mainnet ? network + '.' : ''}etherscan.io/tx/${hash}`
  }
}
