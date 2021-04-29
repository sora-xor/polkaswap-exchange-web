import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'

import router from '@/router'
import { getWalletAddress, formatAddress } from '@/utils'
import { PageNames } from '@/consts'
import web3Util, { Provider } from '@/utils/web3-util'

import TranslationMixin from '@/components/mixins/TranslationMixin'

const getProviderName = provider => {
  switch (provider) {
    case Provider.Metamask:
      return 'provider.metamask'
    default:
      return 'provider.default'
  }
}

const handleProviderError = (provider: Provider, error: any): string => {
  switch (provider) {
    case Provider.Metamask:
      return handleMetamaskError(error)
    default:
      return 'provider.messages.checkExtension'
  }
}

const handleMetamaskError = (error: any): string => {
  switch (error.code) {
    // 4001: User rejected the request
    // -32002: Already processing eth_requestAccounts. Please wait
    // -32002: Request of type 'wallet_requestPermissions' already pending for origin. Please wait
    case -32002:
    case 4001:
      return 'provider.messages.extensionLogin'
    default:
      return 'provider.messages.checkExtension'
  }
}

@Component
export default class WalletConnectMixin extends Mixins(TranslationMixin) {
  @State(state => state.web3.ethAddress) ethAddress!: string

  @Getter('isLoggedIn') isSoraAccountConnected!: boolean
  @Getter('isExternalAccountConnected', { namespace: 'web3' }) isExternalAccountConnected!: boolean

  @Action('setNetworkType', { namespace: 'web3' }) setNetworkType!: (network?: string) => Promise<void>
  @Action('connectExternalAccount', { namespace: 'web3' }) connectExternalAccount!: (options) => Promise<void>
  @Action('switchExternalAccount', { namespace: 'web3' }) switchExternalAccount!: (options) => Promise<void>
  @Action('disconnectExternalAccount', { namespace: 'web3' }) disconnectExternalAccount!: () => Promise<void>

  getWalletAddress = getWalletAddress
  formatAddress = formatAddress

  isExternalWalletConnecting = false

  get areNetworksConnected (): boolean {
    return this.isSoraAccountConnected && this.isExternalAccountConnected
  }

  connectInternalWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  async connectExternalWallet (): Promise<void> {
    // For now it's only Metamask
    const provider = Provider.Metamask

    this.isExternalWalletConnecting = true
    try {
      await this.connectExternalAccount({ provider })
    } catch (error) {
      const name = this.t(getProviderName(provider))
      const message = this.te(error.message)
        ? error.message
        : handleProviderError(provider, error)

      this.$alert(this.t(message, { name }))
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

  async checkConnectionToExternalAccount (func: Function): Promise<void> {
    const connected = await web3Util.checkAccountIsConnected(this.ethAddress)

    if (!connected) {
      await this.connectExternalWallet()
    } else {
      await func()
    }
  }

  async syncExternalAccountWithAppState () {
    const connected = await web3Util.checkAccountIsConnected(this.ethAddress)

    if (connected) return

    await this.disconnectExternalAccount()

    const account = await web3Util.getAccount()

    if (account) {
      await this.changeExternalWallet({ address: account })
    }
  }
}
