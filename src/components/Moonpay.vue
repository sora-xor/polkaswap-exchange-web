<template>
  <dialog-base :visible.sync="isVisible" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <s-button @click="check"></s-button>
    <iframe class="moonpay-frame" :src="widgetUrl" v-loading="loading" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'
import { RegisteredAccountAsset, CodecString } from '@sora-substrate/util'

import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogBase from '@/components/DialogBase.vue'

import { getCssVariableValue, getMaxValue, hasInsufficientEvmNativeTokenForFee } from '@/utils'
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
export default class Moonpay extends Mixins(DialogMixin, LoadingMixin) {
  widgetUrl = ''
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
  @Action('bridgeDataToHistoryItem', { namespace: 'bridge' }) bridgeDataToHistoryItem!: () => Promise<any>
  @Action('saveHistory', { namespace: 'bridge' }) saveHistory!: (history: any) => Promise<void>
  @Action('setHistoryItem', { namespace: 'bridge' }) setHistoryItem

  @Watch('isLoggedIn', { immediate: true })
  private handleLoggedInStateChange (isLoggedIn: boolean): void {
    this.stopPollingMoonpay()

    if (isLoggedIn) {
      this.startPollingMoonpay()
    }
  }

  @Watch('lastCompletedTransaction')
  private async handleLastTransaction (transaction, prevTransaction): Promise<void> {
    if (!transaction || (prevTransaction && prevTransaction.id === transaction.id)) return

    try {
      this.stopPollingMoonpay()
      // get necessary ethereum transaction data
      const ethTransferData = await this.getTransactionTranserData(transaction.cryptoTransactionId)
      if (!ethTransferData) {
        // TODO: show something, we can not transfer token to sora
        throw new Error('Cannot fetch transaction data')
      }

      // check that we can bridge this token
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
      // TODO: check connection to account
      await this.getEvmBalance()
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
      const bridgeDataAsHistory = await this.bridgeDataToHistoryItem()
      const historyItem = {
        // we can check is moonpay purchase was transfered to sora: moonpayTx.id === historyItem.id
        id: transaction.id,
        ...bridgeDataAsHistory
      }

      await this.saveHistory(historyItem)
      await this.setHistoryItem(historyItem)

      // close moonpay dialog & reset it ?
      this.setMoonpayDialogVisibility(false)
      this.updateWidgetUrl()

      // Navigate to the bridge
      router.push({ name: PageNames.BridgeTransaction })
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

  private updateWidgetUrl (): void {
    this.widgetUrl = ''
    setTimeout(() => {
      this.widgetUrl = this.createMoonpayWidgetUrl()
    })
  }

  private async startPollingMoonpay (): Promise<void> {
    console.log('startPollingMoonpay')
    this.transactionsPolling = await this.createTransactionsPolling()
  }

  private stopPollingMoonpay (): void {
    console.log('stopPollingMoonpay')
    if (typeof this.transactionsPolling === 'function') {
      this.transactionsPolling() // call stop polling function
    }
  }

  async check () {
    // const data = await this.getTransactionTranserData('0x56d8acc366a0c0b61d285f1ceccaac54171ddf18c433fdb661844fdedef8d3e0')
    const data = await this.getTransactionTranserData('0x67fbede96e58033fdf4656b5a6f2ed14c6a6b18ffd944e4d8e5b37848a45f307')
    console.log(data)
  }
}
</script>

<style lang="scss">
.dialog-wrapper.moonpay-dialog {
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-big;
  }
}
</style>

<style lang="scss" scoped>
.moonpay {
  &-frame {
    border: none;
    width: 100%;
    min-height: 574px;
    box-shadow: inset -5px -5px 5px rgba(255, 255, 255, 0.5), inset 1px 1px 10px rgba(0, 0, 0, 0.1);
    filter: drop-shadow(1px 1px 5px #FFFFFF);
    border-radius: 20px;
  }
}
</style>
