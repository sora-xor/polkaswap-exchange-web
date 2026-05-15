<template>
  <s-card border-radius="small" shadow="always" size="medium" pressed class="limit-card">
    <div class="limit-card-content">
      <div>
        <div class="limit-card-title">{{ t('confirmNextTxFailure.header') }}</div>
        <div class="limit-card-text">{{ t('bridge.limitMessage', { type, amount, symbol }) }}</div>
      </div>
      <div class="limit-card-badge">
        <s-icon class="limit-card-badge-icon" name="notifications-alert-triangle-24" size="24"></s-icon>
      </div>
    </div>
  </s-card>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

const props = withDefaults(
  defineProps<{
    max?: boolean;
    amount?: string;
    symbol?: string;
  }>(),
  {
    max: false,
    amount: '',
    symbol: '',
  }
);

const { t } = useTranslation();

const type = computed(() => (props.max ? t('maxAmountText') : t('minAmountText')));
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
