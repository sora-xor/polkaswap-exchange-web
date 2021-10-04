<template>
  <s-button
    :class="['moonpay-history-button', { active }]"
    size="medium"
    :type="type"
    :icon="icon"
    :tooltip="tooltip"
    @click="handleClick"
  >
    <span class="moonpay-button-text">{{ text }}</span>
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Action, State } from 'vuex-class';

import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import router from '@/router';
import { PageNames } from '@/consts';

@Component
export default class MoonpayHistoryButton extends Mixins(BridgeHistoryMixin, TranslationMixin) {
  @State((state) => state.moonpay.readyBridgeTransactionId) readyBridgeTransactionId!: string;
  @State((state) => state.moonpay.confirmationVisibility) confirmationVisibility!: string;
  @Action('setConfirmationVisibility', { namespace: 'moonpay' }) setConfirmationVisibility!: (
    flag: boolean
  ) => Promise<void>;

  get active(): boolean {
    return this.$route.name === PageNames.MoonpayHistory;
  }

  get isReadyForTransfer(): boolean {
    return !!this.readyBridgeTransactionId && !this.confirmationVisibility;
  }

  get icon(): string {
    return this.isReadyForTransfer ? '' : 'time-time-history-24';
  }

  get type(): string {
    return this.isReadyForTransfer ? 'primary' : 'tertiary';
  }

  get text(): string {
    return this.isReadyForTransfer ? this.t('moonpay.buttons.transfer') : this.t('moonpay.buttons.history');
  }

  get tooltip(): string {
    return this.isReadyForTransfer ? this.t('moonpay.tooltips.transfer') : '';
  }

  async handleClick(): Promise<void> {
    if (this.isReadyForTransfer) {
      await this.setConfirmationVisibility(true);
    } else {
      router.push({ name: PageNames.MoonpayHistory });
    }
  }
}
</script>

<style lang="scss">
.moonpay-history-button.neumorphic.s-tertiary {
  &.active {
    color: var(--s-color-theme-accent);
    box-shadow: var(--s-shadow-element);
  }
}
</style>
