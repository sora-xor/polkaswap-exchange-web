import { Component, Mixins } from 'vue-property-decorator'
import { Action } from 'vuex-class'

import LoadingMixin from '@/components/mixins/LoadingMixin'
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import web3Util from '@/utils/web3-util'

@Component
export default class BridgeMixin extends Mixins(LoadingMixin, WalletConnectMixin) {
  @Action('getEvmBalance', { namespace: 'web3' }) getEvmBalance!: AsyncVoidFn
  @Action('getEvmNetworkFee', { namespace: 'bridge' }) getEvmNetworkFee!: AsyncVoidFn
  @Action('getRegisteredAssets', { namespace: 'assets' }) getRegisteredAssets!: AsyncVoidFn
  @Action('updateRegisteredAssets', { namespace: 'assets' }) updateRegisteredAssets!: AsyncVoidFn

  private unwatchEthereum!: any
  blockHeadersSubscriber

  async mounted (): Promise<void> {
    await this.setEvmNetworkType()
    await this.syncExternalAccountWithAppState()
    this.getEvmBalance()
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
          this.setEvmNetworkType(networkId)
          this.getEvmNetworkFee()
          this.getRegisteredAssets()
          this.updateExternalBalances()
        },
        onDisconnect: (code: number, reason: string) => {
          this.disconnectExternalAccount()
        }
      })
      this.subscribeToEvmBlockHeaders()
    })
  }

  beforeDestroy (): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum()
    }
    this.unsubscribeEvmBlockHeaders()
  }

  updateExternalBalances (): void {
    this.getEvmBalance()
    this.updateRegisteredAssets()
  }

  async subscribeToEvmBlockHeaders (): Promise<void> {
    try {
      await this.unsubscribeEvmBlockHeaders()

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

  unsubscribeEvmBlockHeaders (): Promise<void> {
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
