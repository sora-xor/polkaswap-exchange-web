import { Component, Mixins } from 'vue-property-decorator'
import { Action } from 'vuex-class'

import LoadingMixin from '@/components/mixins/LoadingMixin'
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import web3Util from '@/utils/web3-util'

@Component
export default class BridgeMixin extends Mixins(LoadingMixin, WalletConnectMixin) {
  @Action('getEthBalance', { namespace: 'web3' }) getEthBalance!: () => Promise<void>
  @Action('getEthNetworkFee', { namespace: 'bridge' }) getEthNetworkFee
  @Action('getRegisteredAssets', { namespace: 'assets' }) getRegisteredAssets
  @Action('updateRegisteredAssets', { namespace: 'assets' }) updateRegisteredAssets

  private unwatchEthereum!: any
  blockHeadersSubscriber

  async mounted (): Promise<void> {
    await this.setEthNetwork()
    await this.syncExternalAccountWithAppState()
    this.getEthBalance()
    this.withApi(async () => {
      this.unwatchEthereum = await web3Util.watchEthereum({
        onAccountChange: (addressList: string[]) => {
          if (addressList.length) {
            this.switchExternalAccount({ address: addressList[0] })
            this.updateRegisteredAssets()
          } else {
            this.disconnectExternalAccount()
          }
        },
        onNetworkChange: (networkId: string) => {
          this.setEthNetwork(networkId)
          this.getEthNetworkFee()
          this.getRegisteredAssets()
          this.updateExternalBalances()
        },
        onDisconnect: (code: number, reason: string) => {
          this.disconnectExternalAccount()
        }
      })
      this.subscribeToEthBlockHeaders()
    })
  }

  beforeDestroy (): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum()
    }
    this.unsubscribeEthBlockHeaders()
  }

  updateExternalBalances (): void {
    this.getEthBalance()
    this.updateRegisteredAssets()
  }

  async subscribeToEthBlockHeaders (): Promise<void> {
    try {
      await this.unsubscribeEthBlockHeaders()

      const web3 = await web3Util.getInstance()

      this.blockHeadersSubscriber = web3.eth.subscribe('newBlockHeaders', (error) => {
        if (!error) {
          this.updateExternalBalances()
        }
      })
    } catch (error) {
      console.error(error)
    }
  }

  unsubscribeEthBlockHeaders (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.blockHeadersSubscriber) return resolve()

      this.blockHeadersSubscriber.unsubscribe((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }
}
