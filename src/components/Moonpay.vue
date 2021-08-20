<template>
  <dialog-base :visible.sync="isVisible" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <div class="widget-container" v-loading="parentLoading || widgetLoading">
      <iframe class="widget" :src="widgetUrl" @load="onLoadWidget" />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'
import { RegisteredAccountAsset, CodecString, BridgeNetworks } from '@sora-substrate/util'

import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import DialogBase from '@/components/DialogBase.vue'

import { getCssVariableValue, getMaxValue, hasInsufficientEvmNativeTokenForFee } from '@/utils'
import ethersUtil from '@/utils/ethers-util'
import { MoonpayApi, MoonpayEVMTransferAssetData } from '@/utils/moonpay'
import router from '@/router'
import { NetworkTypes, PageNames } from '@/consts'

import MoonpayLogo from '@/components/logo/Moonpay.vue'

const namespace = 'moonpay'

@Component({
  components: {
    DialogBase,
    MoonpayLogo
  }
})
export default class Moonpay extends Mixins(DialogMixin, LoadingMixin, WalletConnectMixin) {
  widgetUrl = ''
  widgetLoading = true
  transactionsPolling!: Function

  @Getter account
  @Getter isLoggedIn!: boolean
  @Getter libraryTheme!: Theme
  @Getter('lastCompletedTransaction', { namespace }) lastCompletedTransaction!: any

  @State(state => state[namespace].api) moonpayApi!: MoonpayApi
  @State(state => state[namespace].pollingTimestamp) pollingTimestamp!: number
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes
  @State(state => state.settings.language) language!: string

  @Action('setDialogVisibility', { namespace }) setMoonpayDialogVisibility!: (flag: boolean) => void
  @Action('createTransactionsPolling', { namespace }) createTransactionsPolling!: () => Promise<Function>
  @Action('getTransactionTranserData', { namespace }) getTransactionTranserData!: (tx: any) => Promise<Nullable<MoonpayEVMTransferAssetData>>
  @Action('findRegisteredAssetByExternalAddress', { namespace }) findRegisteredAssetByExternalAddress!: (data: any) => Promise<Nullable<RegisteredAccountAsset>>

  // from bridge
  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString
  @Getter('soraNetworkFee', { namespace: 'bridge' }) soraNetworkFee!: CodecString
  @Getter('evmNetworkFee', { namespace: 'bridge' }) evmNetworkFee!: CodecString
  @Action('getEvmBalance', { namespace: 'web3' }) getEvmBalance!: AsyncVoidFn
  @Action('setSoraToEvm', { namespace: 'bridge' }) setSoraToEvm
  @Action('setAssetAddress', { namespace: 'bridge' }) setAssetAddress
  @Action('getNetworkFee', { namespace: 'bridge' }) getNetworkFee!: AsyncVoidFn
  @Action('getEvmNetworkFee', { namespace: 'bridge' }) getEvmNetworkFee!: AsyncVoidFn
  @Action('setTransactionConfirm', { namespace: 'bridge' }) setTransactionConfirm!: (value: boolean) => Promise<void>
  @Action('setAmount', { namespace: 'bridge' }) setAmount
  @Action('bridgeDataToHistoryItem', { namespace: 'bridge' }) bridgeDataToHistoryItem!: (params: any) => Promise<any>
  @Action('saveHistory', { namespace: 'bridge' }) saveHistory!: (history: any) => Promise<void>
  @Action('setHistoryItem', { namespace: 'bridge' }) setHistoryItem

  @Watch('isLoggedIn', { immediate: true })
  private handleLoggedInStateChange (isLoggedIn: boolean): void {
    if (!isLoggedIn) {
      this.stopPollingMoonpay()
    }
  }

  @Watch('isVisible', { immediate: true })
  private handleVisibleStateChange (visible: boolean): void {
    if (visible && !this.pollingTimestamp) {
      this.startPollingMoonpay()
    }
  }

  @Watch('language')
  @Watch('libraryTheme')
  private handleLanguageChange (): void {
    if (!this.pollingTimestamp) {
      this.updateWidgetUrl()
    }
  }

  @Watch('lastCompletedTransaction')
  private async handleLastTransaction (transaction, prevTransaction): Promise<void> {
    if (!transaction || (prevTransaction && prevTransaction.id === transaction.id)) return

    try {
      await this.setEvmNetwork(BridgeNetworks.ETH_NETWORK_ID)
      await this.setEvmNetworkType()
      await this.syncExternalAccountWithAppState()
      await this.prepareBridgeForTransfer(transaction)
    } catch (error) {
      console.error(error)
    }
  }

  async created (): Promise<void> {
    this.withApi(() => {
      this.moonpayApi.setPublicKey(this.apiKeys.moonpay)
      this.moonpayApi.setNetwork(this.soraNetwork)
      this.updateWidgetUrl()
    })
  }

  beforeDestroy (): void {
    this.stopPollingMoonpay()
  }

  createMoonpayWidgetUrl (): string {
    return this.moonpayApi.createWidgetUrl({
      colorCode: getCssVariableValue('--s-color-theme-accent'),
      externalTransactionId: this.account.address,
      language: this.language
    })
  }

  onLoadWidget (): void {
    this.widgetLoading = false
  }

  private updateWidgetUrl (): void {
    this.widgetLoading = true
    this.widgetUrl = ''
    setTimeout(() => {
      this.widgetUrl = this.createMoonpayWidgetUrl()
    })
  }

  private async startPollingMoonpay (): Promise<void> {
    console.info('Moonpay: start polling to get user transactions')
    this.transactionsPolling = await this.createTransactionsPolling()
  }

  private stopPollingMoonpay (): void {
    console.info('Moonpay: stop polling')
    if (typeof this.transactionsPolling === 'function') {
      this.transactionsPolling()
    }
  }

  private async prepareBridgeForTransfer (transaction): Promise<void> {
    this.stopPollingMoonpay()

    // get necessary ethereum transaction data
    const ethTransferData = await this.getTransactionTranserData(transaction.cryptoTransactionId)

    if (!ethTransferData) {
      // TODO: show something, we can not transfer token to sora
      throw new Error('Cannot fetch transaction data')
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
      // TODO: show something, we can not transfer token to sora
      throw new Error('Asset is not registered')
    }

    // prepare bridge state for fetching fees
    await this.setTransactionConfirm(true)
    await this.setSoraToEvm(false)
    await this.setAssetAddress(registeredAsset.address)
    // fetching fees & evm balance
    await this.getNetworkFee()
    await this.getEvmNetworkFee()
    // await this.getEvmBalance()
    // check eth fee
    const hasEthForFee = !hasInsufficientEvmNativeTokenForFee(this.evmBalance, this.evmNetworkFee)
    if (!hasEthForFee) {
      // TODO: show something, we can not transfer token to sora
      throw new Error('Insufficient ETH for fee')
    }
    const maxAmount = getMaxValue(registeredAsset, this.evmNetworkFee, true) // max balance (minus fee if eth asset)
    const amount = Number(maxAmount) >= Number(ethTransferData.amount) ? ethTransferData.amount : maxAmount

    if (+amount <= 0) {
      // TODO: show something, we can not transfer token to sora
      throw new Error('Insufficient amount')
    }

    await this.setAmount(amount)

    // Create bridge history item
    const bridgeDataAsHistory = await this.bridgeDataToHistoryItem({ to: ethTransferData.to })
    const historyItem = {
      // we can check is moonpay purchase was transfered to sora: moonpayTx.id === historyItem.id
      id: transaction.id,
      ...bridgeDataAsHistory
    }

    await this.saveHistory(historyItem)
    await this.setHistoryItem(historyItem)

    // Navigate to the bridge
    router.push({ name: PageNames.BridgeTransaction })

    // close moonpay dialog & reset it ?
    this.setMoonpayDialogVisibility(false)
  }
}
</script>

<style lang="scss">
.dialog-wrapper.moonpay-dialog {
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-big;
  }
}
.widget-container .el-loading-mask {
  background-color: var(--s-color-utility-surface);
}
</style>

<style lang="scss" scoped>
.widget-container {
  display: flex;
  border: none;
  width: 100%;
  min-height: 574px;
  overflow: hidden;
}
.widget {
  flex: 1;
  border: none;
  border-radius: 20px;
}
</style>
