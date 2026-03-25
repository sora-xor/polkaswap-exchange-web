<template>
  <info-line class="prev-next-info-line" :label="label" :label-tooltip="tooltip">
    <formatted-amount
      class="prev"
      :value="prev"
      :asset-symbol="firstSymbol"
      :font-size-rate="fontSize"
      :font-weight-rate="fontWeight"
    ></formatted-amount>
    <span class="divider">→</span>
    <formatted-amount
      class="next"
      :value="next"
      :asset-symbol="symbol"
      :font-size-rate="fontSize"
      :font-weight-rate="fontWeight"
    ></formatted-amount>
    <slot></slot>
  </info-line>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { components } from '@/shims/wallet-components';

import { FontSizeRate, FontWeightRate } from '@/consts';
const FormattedAmount = components.FormattedAmount;
const InfoLine = components.InfoLine;

const props = withDefaults(
  defineProps<{
    prev?: string;
    next?: string;
    symbol?: string;
    label?: string;
    tooltip?: string;
  }>(),
  {
    prev: '0',
    next: '0',
    symbol: '',
    label: '',
    tooltip: '',
  }
);

const fontSize = FontSizeRate.MEDIUM;
const fontWeight = FontWeightRate.SMALL;

const isPercentSymbol = computed(() => props.symbol === '%');
const firstSymbol = computed(() => (isPercentSymbol.value ? props.symbol : ''));
</script>

<style lang="scss" scoped>
.divider {
  margin: 0 4px;
  font-weight: 600;
}
</style>
