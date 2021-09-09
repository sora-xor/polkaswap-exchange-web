import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { BridgeNetworks, RegisteredAccountAsset, CodecString, BridgeHistory } from '@sora-substrate/util'

import ethersUtil from '@/utils/ethers-util'
import { getMaxValue, hasInsufficientEvmNativeTokenForFee } from '@/utils'
import { MoonpayEVMTransferAssetData, MoonpayApi } from '@/utils/moonpay'
import { MoonpayNotifications } from '@/components/Moonpay/consts'
import { NetworkTypes } from '@/consts'

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

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
  @Action('generateHistoryItem', { namespace: 'bridge' }) generateHistoryItem!: (history: any) => Promise<BridgeHistory>

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

  async checkTxTransferAvailability (transaction): Promise<string> {
    return await this.withLoading(async () => {
      await this.prepareEvmNetwork()
      // get necessary ethereum transaction data
      const ethTransferData = await this.getTransactionTranserData(transaction.cryptoTransactionId)

      if (!ethTransferData) {
        throw createError(`Cannot fetch transaction data: ${transaction.cryptoTransactionId}`, MoonpayNotifications.TransactionError)
      }

      // check connection to account
      const isAccountConnected = await ethersUtil.checkAccountIsConnected(ethTransferData.to)

      if (!isAccountConnected) {
        // TODO: show something, we can not transfer token to sora
        throw createError(`Account for transfer is not connected: ${ethTransferData.to}`, MoonpayNotifications.AccountAddressError)
      }

      // while registered assets updating, evmBalance updating too
      const registeredAsset = await this.findRegisteredAssetByExternalAddress(ethTransferData.address)

      if (!registeredAsset) {
        throw createError(`Asset is not registered: ethereum address ${ethTransferData.address}`, MoonpayNotifications.SupportError)
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
      const amount = Math.min(Number(maxAmount), Number(ethTransferData.amount))

      if (amount <= 0) {
        // TODO: show something, we can not transfer token to sora
        throw createError('Insufficient amount', MoonpayNotifications.AmountError)
      }

      await this.setAmount(String(amount))

      // Create bridge history item
      const historyItem = await this.generateHistoryItem({
        to: ethTransferData.to,
        payload: {
          moonpayId: transaction.id
        }
      })

      return historyItem.id
    })
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
