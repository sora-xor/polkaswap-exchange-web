import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'

import router from '@/router'
import { isWalletConnected, getWalletAddress, formatAddress } from '@/utils'
import { PageNames } from '@/consts'
import { Provider } from '@/utils/web3-util'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class WalletConnectMixin extends Mixins(TranslationMixin) {
  @State(state => state.web3.ethAddress) ethAddress!: string

  @Getter('isExternalAccountConnected', { namespace: 'web3' }) isExternalAccountConnected!: boolean

  @Action('setEthNetwork', { namespace: 'web3' }) setEthNetwork!: (network?: string) => Promise<void>
  @Action('connectExternalAccount', { namespace: 'web3' }) connectExternalAccount!: (options) => Promise<void>
  @Action('switchExternalAccount', { namespace: 'web3' }) switchExternalAccount!: (options) => Promise<void>
  @Action('disconnectExternalAccount', { namespace: 'web3' }) disconnectExternalAccount!: () => Promise<void>

  getWalletAddress = getWalletAddress
  formatAddress = formatAddress

  isExternalWalletConnecting = false

  get isSoraAccountConnected (): boolean {
    return isWalletConnected()
  }

  get areNetworksConnected (): boolean {
    return this.isSoraAccountConnected && this.isExternalAccountConnected
  }

  connectInternalWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  async connectExternalWallet (): Promise<void> {
    // For now it's only Metamask
    if (this.isExternalWalletConnecting) {
      return
    }
    this.isExternalWalletConnecting = true
    try {
      await this.connectExternalAccount({ provider: Provider.Metamask })
    } catch (error) {
      const provider = this.t(error.message)
      this.$alert(this.t('walletProviderConnectionError', { provider }))
    } finally {
      this.isExternalWalletConnecting = false
    }
  }

  // TODO: Check why we can't choose another account
  async changeExternalWallet (options?: any): Promise<void> {
    // For now it's only Metamask
    if (this.isExternalWalletConnecting) {
      return
    }
    this.isExternalWalletConnecting = true
    try {
      await this.switchExternalAccount(options)
    } catch (error) {
      console.error(error)
    } finally {
      this.isExternalWalletConnecting = false
    }
  }
}
