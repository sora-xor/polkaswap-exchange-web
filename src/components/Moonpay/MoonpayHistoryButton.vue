<template>
  <s-button
    v-if="isReadyForTransfer"
    class="moonpay-history-button"
    size="medium"
    type="primary"
    @click="handleClick"
  >
    {{ t('moonpay.buttons.transfer') }}
  </s-button>
  <s-button
    v-else
    :class="['moonpay-history-button', { active }]"
    type="action"
    :tooltip="t('moonpay.buttons.history')"
    @click="handleClick"
  >
    <s-icon name="time-time-history-24" size="28" />
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, State } from 'vuex-class'

import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'

import router from '@/router'
import { PageNames } from '@/consts'

@Component
export default class MoonpayHistoryButton extends Mixins(BridgeHistoryMixin, TranslationMixin) {
  @State(state => state.moonpay.readyBridgeTransactionId) transactionId!: string
  @State(state => state.moonpay.confirmationVisibility) confirmationVisibility!: string
  @Action('setReadyBridgeTransactionId', { namespace: 'moonpay' }) setReadyBridgeTransactionId!: (id?: string) => Promise<void>

  get active (): boolean {
    return this.$route.name === PageNames.MoonpayHistory
  }

  get isReadyForTransfer (): boolean {
    return !!this.transactionId && !this.confirmationVisibility
  }

  async handleClick (): Promise<void> {
    if (this.isReadyForTransfer) {
      await this.setReadyBridgeTransactionId()
      await this.showHistory(this.transactionId)
    } else {
      router.push({ name: PageNames.MoonpayHistory })
    }
  }
}
</script>

<style lang="scss">
.moonpay-history-button.neumorphic.s-action.active {
  &, &:hover, &:focus, &.focusing {
    color: var(--s-color-theme-accent-focused);
    box-shadow: var(--s-shadow-element);
  }
}
</style>
