<template>
  <dialog-base :visible.sync="isVisible" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <template #close>
      <s-button class="el-dialog__close" type="action" icon="x-16" @click="closeDialog" />
    </template>
    <component :is="dialogComponent.name" v-bind="dialogComponent.props" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'

import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import DialogBase from '@/components/DialogBase.vue'

import MoonpayBridgeInitMixin from './MoonpayBridgeInitMixin'

import { getCssVariableValue } from '@/utils'
import { MoonpayApi } from '@/utils/moonpay'
import { lazyComponent } from '@/router'
import { NetworkTypes, Components } from '@/consts'
import { MoonpayDialogState, MoonpayNotifications } from '@/components/Moonpay/consts'

import MoonpayLogo from '@/components/logo/Moonpay.vue'

const namespace = 'moonpay'

@Component({
  components: {
    DialogBase,
    MoonpayLogo,
    MoonpayWidget: lazyComponent(Components.MoonpayWidget),
    MoonpayNotification: lazyComponent(Components.MoonpayNotification)
  }
})
export default class Moonpay extends Mixins(DialogMixin, LoadingMixin, WalletConnectMixin, MoonpayBridgeInitMixin) {
  widgetUrl = ''
  notification = ''
  transactionsPolling!: Function

  @Getter account
  @Getter isLoggedIn!: boolean
  @Getter libraryTheme!: Theme
  @Getter('lastCompletedTransaction', { namespace }) lastCompletedTransaction!: any

  @State(state => state[namespace].api) moonpayApi!: MoonpayApi
  @State(state => state[namespace].pollingTimestamp) pollingTimestamp!: number
  @State(state => state[namespace].dialogState) dialogState!: MoonpayDialogState
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes
  @State(state => state.settings.language) language!: string

  @Action('setDialogVisibility', { namespace }) setDialogVisibility!: (flag: boolean) => Promise<void>
  @Action('setDialogState', { namespace }) setDialogState!: (value: MoonpayDialogState) => Promise<void>
  @Action('createTransactionsPolling', { namespace }) createTransactionsPolling!: () => Promise<Function>

  @Watch('isLoggedIn', { immediate: true })
  private handleLoggedInStateChange (isLoggedIn: boolean): void {
    if (!isLoggedIn) {
      this.stopPollingMoonpay()
    }
  }

  @Watch('isVisible', { immediate: true })
  private handleVisibleStateChange (visible: boolean): void {
    if (visible && !this.pollingTimestamp && this.dialogState === MoonpayDialogState.Purchase) {
      this.startPollingMoonpay()
    }
  }

  @Watch('language')
  @Watch('libraryTheme')
  private handleLanguageChange (): void {
    if (!this.pollingTimestamp) {
      this.resetDialogState()
    }
  }

  @Watch('lastCompletedTransaction')
  private async handleLastTransaction (transaction, prevTransaction): Promise<void> {
    if (!transaction || (prevTransaction && prevTransaction.id === transaction.id)) return

    await this.prepareBridgeForTransfer(transaction)
  }

  async created (): Promise<void> {
    this.withApi(() => {
      this.moonpayApi.setPublicKey(this.apiKeys.moonpay)
      this.moonpayApi.setNetwork(this.soraNetwork)
      this.resetDialogState()
    })
  }

  beforeDestroy (): void {
    this.stopPollingMoonpay()
  }

  get dialogComponent (): any {
    switch (this.dialogState) {
      case MoonpayDialogState.Purchase:
        return {
          name: 'MoonpayWidget',
          props: {
            src: this.widgetUrl
          }
        }
      case MoonpayDialogState.Notification:
      default:
        return {
          name: 'MoonpayNotification',
          props: {
            notification: this.notification,
            onClick: this.closeDialog
          }
        }
    }
  }

  get inProcessState (): boolean {
    return this.dialogState !== MoonpayDialogState.Notification || this.notification === MoonpayNotifications.Success
  }

  createMoonpayWidgetUrl (): string {
    return this.moonpayApi.createWidgetUrl({
      colorCode: getCssVariableValue('--s-color-theme-accent'),
      externalTransactionId: this.account.address,
      language: this.language
    })
  }

  private async closeDialog (): Promise<void> {
    await this.setDialogVisibility(false)

    if (!this.inProcessState) {
      await this.resetDialogState()
    }
  }

  private updateWidgetUrl (): void {
    this.widgetUrl = ''

    const url = this.createMoonpayWidgetUrl()

    setTimeout(() => {
      this.widgetUrl = url
    })
  }

  private async resetDialogState (): Promise<void> {
    await this.setDialogState(MoonpayDialogState.Purchase)
    this.updateWidgetUrl()
    this.notification = ''
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
    try {
      this.stopPollingMoonpay()
      this.notification = MoonpayNotifications.Success

      await this.setDialogState(MoonpayDialogState.Notification)
      await this.checkTxTransferAvailability(transaction) // MoonpayBridgeInitMixin
    } catch (error) {
      if (Object.values(MoonpayNotifications).includes(error.name)) {
        this.notification = error.name
        await this.setDialogState(MoonpayDialogState.Notification)
        await this.setDialogVisibility(true)
      } else {
        console.error(error)
      }
    }
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
