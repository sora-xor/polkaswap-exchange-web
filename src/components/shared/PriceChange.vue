<template>
  <div :class="classes">
    <s-icon class="price-change-arrow" :name="icon" size="14px" />
    <formatted-amount :value="formatted" :font-weight-rate="FontWeightRate.MEDIUM" :integer-only="integerOnly">
      %
    </formatted-amount>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { computed } from 'vue';

import { FontWeightRate } from '@/lib/soraneo-wallet/src/consts';
import { toPrecision } from '@/utils/fp';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';

/**
 * Renders percentage change with an arrow indicator and wallet-styled formatting.
 */
defineOptions({
  name: 'PriceChange',
  components: {
    FormattedAmount: WalletComponentFormattedAmount,
  },
});

const props = defineProps<{
  value?: FPNumber;
}>();

const price = computed(() => props.value ?? FPNumber.ZERO);
const increased = computed(() => FPNumber.gte(price.value, FPNumber.ZERO));
const icon = computed(() => `arrows-arrow-bold-${increased.value ? 'top' : 'bottom'}-24`);
const classes = computed(() => {
  const baseClass = 'price-change';
  return increased.value ? [baseClass, `${baseClass}--increased`] : [baseClass];
});
const rounded = computed(() => Number(toPrecision(increased.value ? price.value : price.value.mul(new FPNumber(-1)), 2).toFixed(2)));
const integerOnly = computed(() => Number.isInteger(rounded.value));
const formatted = computed(() => {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(rounded.value);
});
</script>

<style lang="scss" scoped>
.price-change {
  display: inline-flex;
  align-items: baseline;
  color: var(--s-color-theme-accent);
  font-size: inherit;
  font-weight: 600;
  line-height: var(--s-line-height-medium);

  &--increased {
    color: var(--s-color-theme-secondary-hover);
  }

  :deep(.price-change-arrow) {
    color: inherit;
    font-size: 14px !important;
    line-height: 14px !important;
  }
}
</style>
