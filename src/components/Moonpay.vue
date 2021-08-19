<template>
  <dialog-base :visible.sync="isVisible" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <iframe class="moonpay-frame" :src="widgetUrl" v-loading="loading" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'

import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogBase from '@/components/DialogBase.vue'

import { NetworkTypes } from '@/consts'
import { getCssVariableValue } from '@/utils'
import { MoonpayApi } from '@/utils/moonpay'

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
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes
  @State(state => state.settings.language) language!: string

  @Action('setDialogVisibility', { namespace: 'moonpay' }) setMoonpayDialogVisibility!: (flag: boolean) => void
  @Action('createTransactionsPolling', { namespace: 'moonpay' }) createTransactionsPolling!: () => Promise<Function>
  @Action('updatePollingTimestamp', { namespace: 'moonpay' }) updatePollingTimestamp!: () => Promise<void>
  @Action('getTransactionTokenAddress', { namespace: 'moonpay' }) getTransactionTokenAddress!: (tx: any) => Promise<void>

  @Watch('isLoggedIn', { immediate: true })
  private handleLoggedInStateChange (isLoggedIn: boolean): void {
    this.stopPolling()

    if (isLoggedIn) {
      this.startPolling()
    }
  }

  @Watch('lastCompletedTransaction')
  private async handleLastTransaction (transaction, prevTransaction): Promise<void> {
    if (!transaction || (prevTransaction && prevTransaction.id === transaction.id)) return

    // check that we can bridge this token
    // then bridge it
    console.log(transaction)
    await this.getTransactionTokenAddress(transaction)
    this.updatePollingTimestamp()
    this.setMoonpayDialogVisibility(false)
    // this.updateWidgetUrl()
  }

  async created (): Promise<void> {
    this.withApi(() => {
      this.moonpayApi.setPublicKey(this.apiKeys.moonpay)
      this.moonpayApi.setNetwork(this.soraNetwork)
      this.updateWidgetUrl()
    })
  }

  beforeDestroy (): void {
    this.stopPolling()
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

  private async startPolling (): Promise<void> {
    console.log('startPolling')
    this.transactionsPolling = await this.createTransactionsPolling()
  }

  private stopPolling (): void {
    console.log('stopPolling')
    if (typeof this.transactionsPolling === 'function') {
      this.transactionsPolling() // call stop polling function
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
