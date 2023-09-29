<template>
  <s-card border-radius="small" shadow="always" size="medium" pressed class="limit-card">
    <div class="limit-card-content">
      <div>
        <div class="limit-card-title">{{ t('confirmNextTxFailure.header') }}</div>
        <div class="limit-card-text">{{ t('bridge.limitMessage', { type, amount, symbol }) }}</div>
      </div>
      <div class="limit-card-badge">
        <s-icon class="limit-card-badge-icon" name="notifications-alert-triangle-24" size="24" />
      </div>
    </div>
  </s-card>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class BridgeLimitCard extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly max!: boolean;
  @Prop({ default: '', type: String }) readonly amount!: string;
  @Prop({ default: '', type: String }) readonly symbol!: string;

  get type(): string {
    return this.max ? this.t('maxAmountText') : this.t('minAmountText');
  }
}
</script>

<style lang="scss" scoped>
.limit-card {
  &-content {
    display: flex;
    flex-flow: row nowrap;
    align-items: flex-start;
    gap: $inner-spacing-medium;
  }
  &-title {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-medium);
  }
  &-text {
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
  }
  &-badge {
    border-radius: 50%;
    background-color: var(--s-color-status-info);
    padding: $inner-spacing-mini;
    box-shadow: var(--s-shadow-element-pressed);

    &-icon {
      color: white;
    }
  }
}
</style>
