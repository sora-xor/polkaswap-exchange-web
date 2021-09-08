import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'

import router from '@/router'
import { getWalletAddress, formatAddress } from '@/utils'
import { PageNames } from '@/consts'
import ethersUtil, { Provider } from '@/utils/ethers-util'

import TranslationMixin from '@/components/mixins/TranslationMixin'

const checkExtensionKey = 'provider.messages.checkExtension'
const installExtensionKey = 'provider.messages.installExtension'

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
      return checkExtensionKey
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
      return checkExtensionKey
  }
}

@Component
export default class WalletConnectMixin extends Mixins(TranslationMixin) {
  @State(state => state.web3.evmAddress) evmAddress!: string

  @Getter('isLoggedIn') isSoraAccountConnected!: boolean
  @Getter('isExternalAccountConnected', { namespace: 'web3' }) isExternalAccountConnected!: boolean

  @Action('setEvmNetwork', { namespace: 'web3' }) setEvmNetwork
  @Action('setEvmNetworkType', { namespace: 'web3' }) setEvmNetworkType!: (network?: string) => Promise<void>
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
      const key = this.te(error.message)
        ? error.message
        : handleProviderError(provider, error)

      const message = this.t(key, { name })
      const showCancelButton = key === installExtensionKey

      this.$alert(message, {
        showCancelButton,
        cancelButtonText: this.t('provider.messages.reloadPage'),
        callback: action => {
          if (action === 'cancel') {
            router.go(0)
          }
        }
      })
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
    const connected = await ethersUtil.checkAccountIsConnected(this.evmAddress)

    if (!connected) {
      await this.connectExternalWallet()
    } else {
      await func()
    }
  }

  async syncExternalAccountWithAppState () {
    try {
      const connected = await ethersUtil.checkAccountIsConnected(this.evmAddress)

      if (!connected && this.evmAddress) {
        await this.disconnectExternalAccount()
      }
    } catch (error) {
      await this.disconnectExternalAccount()
    }
  }
}
