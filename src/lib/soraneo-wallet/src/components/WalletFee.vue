<template>
  <div class="info-line-container">
    <info-line
      class="wallet-fee"
      is-formatted
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedValue"
      :asset-symbol="xor"
      :fiat-value="formattedFiatValue"
    ></info-line>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import { useFormattedAmount } from '../composables/useFormattedAmount';

import InfoLine from './InfoLine.vue';

const props = defineProps<{
  value: FPNumber;
}>();

const { t } = useTranslation();
const { getFPNumberFiatAmountByFPNumber } = useFormattedAmount();

const xor = XOR.symbol;

const formatValue = (value: FPNumber): string => {
  return value.isFinity() ? value.toLocaleString() : value.toString();
};

const formattedValue = computed(() => formatValue(props.value));

const formattedFiatValue = computed(() => {
  const value = getFPNumberFiatAmountByFPNumber(props.value);
  if (!value) return value;
  return formatValue(value);
});
</script>
