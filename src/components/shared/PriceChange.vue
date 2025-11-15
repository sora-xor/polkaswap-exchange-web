<template>
  <div :class="classes">
    <s-icon class="price-change-arrow" :name="icon" size="14px" />
    <formatted-amount :value="formatted" :font-weight-rate="FontWeightRate.MEDIUM">%</formatted-amount>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import FormattedAmount from '@wallet/src/components/FormattedAmount.vue';
import { FontWeightRate } from '@wallet/src/consts';
import { computed } from 'vue';

import { toPrecision } from '@/utils/fp';

/**
 * Renders percentage change with an arrow indicator and wallet-styled formatting.
 */
defineOptions({
  name: 'PriceChange',
  components: {
    FormattedAmount,
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
const formatted = computed(() => {
  const normalized = increased.value ? price.value : price.value.mul(new FPNumber(-1));
  return toPrecision(normalized, 2).toLocaleString();
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

  &-arrow {
    color: inherit;
  }
}
</style>
