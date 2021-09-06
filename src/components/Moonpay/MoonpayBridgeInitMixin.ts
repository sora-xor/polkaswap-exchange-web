import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { BridgeNetworks, RegisteredAccountAsset, CodecString } from '@sora-substrate/util'

import ethersUtil from '@/utils/ethers-util'
import { getMaxValue, hasInsufficientEvmNativeTokenForFee } from '@/utils'
import { MoonpayEVMTransferAssetData, MoonpayApi } from '@/utils/moonpay'
import { MoonpayNotifications } from '@/components/Moonpay/consts'

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

import router from '@/router'
import { NetworkTypes, PageNames } from '@/consts'

const createError = (text: string, notification: MoonpayNotifications) => {
  const error = new Error(text)
  error.name = notification
  return error
}

@Component
export default class MoonpayBridgeInitMixin extends Mixins(WalletConnectMixin, LoadingMixin) {
  @State(state => state.moonpay.api) moonpayApi!: MoonpayApi
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes

  @Action('setAmount', { namespace: 'bridge' }) setAmount!: (value: string) => Promise<void>
  @Action('getEvmNetworkFee', { namespace: 'bridge' }) getEvmNetworkFee!: AsyncVoidFn
  @Action('setAssetAddress', { namespace: 'bridge' }) setAssetAddress!: (value: string) => Promise<void>
  @Action('setSoraToEvm', { namespace: 'bridge' }) setSoraToEvm!: (value: boolean) => Promise<void>
  @Action('setTransactionConfirm', { namespace: 'bridge' }) setTransactionConfirm!: (value: boolean) => Promise<void>
  @Action('generateHistoryItem', { namespace: 'bridge' }) generateHistoryItem!: (history: any) => Promise<void>

  @Action('getTransactionTranserData', { namespace: 'moonpay' }) getTransactionTranserData!: (tx: any) => Promise<Nullable<MoonpayEVMTransferAssetData>>
  @Action('findRegisteredAssetByExternalAddress', { namespace: 'moonpay' }) findRegisteredAssetByExternalAddress!: (data: any) => Promise<Nullable<RegisteredAccountAsset>>
  @Action('setNotificationVisibility', { namespace: 'moonpay' }) setNotificationVisibility!: (flag: boolean) => Promise<void>
  @Action('setNotificationKey', { namespace: 'moonpay' }) setNotificationKey!: (key: string) => Promise<void>

  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString
  @Getter('evmNetworkFee', { namespace: 'bridge' }) evmNetworkFee!: CodecString

  async prepareEvmNetwork (networkId = BridgeNetworks.ETH_NETWORK_ID): Promise<void> {
    await this.setEvmNetwork(networkId) // WalletConnectMixin
    await this.setEvmNetworkType() // WalletConnectMixin
    await this.syncExternalAccountWithAppState() // WalletConnectMixin
  }

  initMoonpayApi (): void {
    this.moonpayApi.setPublicKey(this.apiKeys.moonpay)
    this.moonpayApi.setNetwork(this.soraNetwork)
  }

  async checkTxTransferAvailability (transaction): Promise<void> {
    await this.withLoading(async () => {
      await this.prepareEvmNetwork()
      // get necessary ethereum transaction data
      const ethTransferData = await this.getTransactionTranserData(transaction.cryptoTransactionId)

      if (!ethTransferData) {
        throw createError('Cannot fetch transaction data', MoonpayNotifications.TransactionError)
      }

      // check connection to account
      const isAccountConnected = await ethersUtil.checkAccountIsConnected(ethTransferData.to)

      if (!isAccountConnected) {
        // TODO: show something, we can not transfer token to sora
        throw new Error('Account for transfer is not connected ')
      }

      // while registered assets updating, evmBalance updating too
      const registeredAsset = await this.findRegisteredAssetByExternalAddress(ethTransferData.address)

      if (!registeredAsset) {
        throw createError('Asset is not registered', MoonpayNotifications.SupportError)
      }

      // prepare bridge state for fetching fees
      await this.setTransactionConfirm(true)
      await this.setSoraToEvm(false)
      await this.setAssetAddress(registeredAsset.address)
      // fetching fee & evm balance
      await this.getEvmNetworkFee()
      // await this.getEvmBalance()
      // check eth fee
      const hasEthForFee = !hasInsufficientEvmNativeTokenForFee(this.evmBalance, this.evmNetworkFee)

      if (!hasEthForFee) {
        throw createError('Insufficient ETH for fee', MoonpayNotifications.FeeError)
      }

      const maxAmount = getMaxValue(registeredAsset, this.evmNetworkFee, true) // max balance (minus fee if eth asset)
      const amount = Number(maxAmount) >= Number(ethTransferData.amount) ? ethTransferData.amount : maxAmount

      if (+amount <= 0) {
        // TODO: show something, we can not transfer token to sora
        throw new Error('Insufficient amount')
      }

      await this.setAmount(amount)

      // Create bridge history item
      await this.generateHistoryItem({
        to: ethTransferData.to,
        payload: {
          moonpayId: transaction.id
        }
      })

      this.navigateToBridgeTransaction()
    })
  }

  navigateToBridgeTransaction (): void {
    router.push({ name: PageNames.BridgeTransaction })
  }

  async showNotification (key: string): Promise<void> {
    await this.setNotificationKey(key)
    await this.setNotificationVisibility(true)
  }

  async handleBridgeInitError (error: Error): Promise<void> {
    if (Object.values(MoonpayNotifications).includes(error.name as MoonpayNotifications)) {
      await this.showNotification(error.name)
    } else {
      console.error(error)
    }
  }
}
