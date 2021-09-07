<template>
  <s-button
    size="medium"
    :type="type"
    :icon="icon"
    @click="handleClick"
  >
    {{ text }}
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, State } from 'vuex-class'

import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin'

import router from '@/router'
import { PageNames } from '@/consts'

@Component
export default class MoonpayHistoryButton extends Mixins(BridgeHistoryMixin) {
  @State(state => state.moonpay.readyBridgeTransactionId) transactionId!: string
  @Action('setReadyBridgeTransactionId', { namespace: 'moonpay' }) setReadyBridgeTransactionId!: (id: string) => Promise<void>

  get icon (): string {
    return this.transactionId ? '' : 'time-time-history-24'
  }

  get type (): string {
    return this.transactionId ? 'primary' : 'tertiary'
  }

  get text (): string {
    return this.transactionId ? 'Start Bridge' : 'Tx History'
  }

  handleClick (): void {
    if (this.transactionId) {
      this.showHistory(this.transactionId)
      this.setReadyBridgeTransactionId('')
    } else {
      router.push({ name: PageNames.MoonpayHistory })
    }
  }
}
</script>
