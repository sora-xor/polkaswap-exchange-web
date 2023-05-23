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
import type { BridgeHistory } from '@sora-substrate/util';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { goTo } from '@/router';
import { PageNames } from '@/consts';
import { state, mutation } from '@/store/decorators';

@Component
export default class MoonpayHistoryButton extends Mixins(TranslationMixin) {
  @state.moonpay.bridgeTransactionData private bridgeTransactionData!: Nullable<BridgeHistory>;
  @state.moonpay.startBridgeButtonVisibility private startBridgeButtonVisibility!: boolean;

  @mutation.moonpay.setConfirmationVisibility private setConfirmationVisibility!: (flag: boolean) => void;

  get active(): boolean {
    return this.$route.name === PageNames.MoonpayHistory;
  }

  get isReadyForTransfer(): boolean {
    return this.startBridgeButtonVisibility && !!this.bridgeTransactionData;
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
      this.setConfirmationVisibility(true);
    } else {
      goTo(PageNames.MoonpayHistory);
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
