<template>
  <div :class="computedClasses">
    <formatted-amount
      :class="valueClass"
      :value="value"
      :font-size-rate="fontSizeRate"
      :font-weight-rate="fontWeightRate"
      :asset-symbol="assetSymbol"
      :symbol-as-decimal="symbolAsDecimal"
      :value-can-be-hidden="valueCanBeHidden"
    >
      <slot></slot>
    </formatted-amount>
    <formatted-amount
      v-if="hasFiatValue"
      is-fiat-value
      :value="fiatValue"
      :font-size-rate="fiatFormatAsValue ? fontSizeRate : fiatFontSizeRate"
      :font-weight-rate="fiatFormatAsValue ? fontWeightRate : fiatFontWeightRate"
      :with-left-shift="withLeftShift"
      :value-can-be-hidden="valueCanBeHidden"
    ></formatted-amount>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';

import { FontSizeRate, FontWeightRate } from '../consts';

import FormattedAmount from './FormattedAmount.vue';

const props = withDefaults(
  defineProps<{
    valueClass?: string;
    value?: string;
    fontSizeRate?: string;
    fontWeightRate?: string;
    assetSymbol?: string;
    symbolAsDecimal?: boolean;
    hasFiatValue?: boolean;
    fiatValue?: string;
    fiatFormatAsValue?: boolean;
    valueCanBeHidden?: boolean;
    fiatFontSizeRate?: string;
    fiatFontWeightRate?: string;
    withLeftShift?: boolean;
  }>(),
  {
    valueClass: '',
    value: '',
    fontSizeRate: FontSizeRate.NORMAL,
    fontWeightRate: FontWeightRate.NORMAL,
    assetSymbol: '',
    symbolAsDecimal: false,
    hasFiatValue: true,
    fiatValue: '',
    fiatFormatAsValue: false,
    valueCanBeHidden: false,
    fiatFontSizeRate: FontSizeRate.NORMAL,
    fiatFontWeightRate: FontWeightRate.NORMAL,
    withLeftShift: false,
  }
);

const {
  valueClass,
  value,
  fontSizeRate,
  fontWeightRate,
  assetSymbol,
  symbolAsDecimal,
  hasFiatValue,
  fiatValue,
  fiatFormatAsValue,
  valueCanBeHidden,
  fiatFontSizeRate,
  fiatFontWeightRate,
  withLeftShift,
} = toRefs(props);

const computedClasses = computed(() => {
  const baseClass = 'formatted-amount__container';
  const classes = [baseClass];

  if (+value.value === 0) {
    classes.push(`${baseClass}--nowrap`);
  }

  return classes.join(' ');
});
</script>

<style scoped lang="scss">
.formatted-amount__container {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  flex-wrap: wrap;
  word-break: break-word;
  text-align: right;
  &--nowrap {
    white-space: nowrap;
  }
}
</style>
