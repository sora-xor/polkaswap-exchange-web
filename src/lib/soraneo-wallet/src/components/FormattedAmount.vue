<template>
  <span
    v-if="shouldRender"
    ref="parent"
    :class="computedClasses"
    @mouseenter="checkWiderFlag"
    @mouseleave="resetWiderFlag"
    @touchstart="checkWiderFlag"
    @touchend="resetWiderFlag"
  >
    <span ref="child" class="formatted-amount__value">
      <span
        v-if="!isHiddenValue && (isFiatValue || $slots.prefix || customizableCurrency)"
        class="formatted-amount__prefix"
      >
        <slot name="prefix">{{ symbol }}</slot>
      </span> <span v-if="!isHiddenValue || (isHiddenValue && integerOnly)" class="formatted-amount__integer">{{
        isHiddenValue ? HiddenValue : formatted.integer
      }}</span> <span v-if="!integerOnly || (assetSymbol && symbolAsDecimal)" class="formatted-amount__decimal">
        <span class="formatted-amount__decimal-value">{{
          integerOnly ? '' : isHiddenValue ? HiddenValue : formatted.decimal
        }}</span> <span v-if="assetSymbol && symbolAsDecimal" class="formatted-amount__symbol">{{ assetSymbol }}</span>
      </span>
      <span v-if="assetSymbol && !symbolAsDecimal" class="formatted-amount__symbol">{{ assetSymbol }}</span>
      <slot></slot>
    </span>
  </span>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref } from 'vue';

import { Currency } from '@/types/currency';
import { useWalletStore } from '@/stores/wallet';
import { FontSizeRate, FontWeightRate, HiddenValue } from '../consts';
import { DaiCurrency } from '../consts/currencies';
import { getCurrency } from '../util';

const props = withDefaults(
  defineProps<{
    value?: string | number;
    fontSizeRate?: string;
    fontWeightRate?: string;
    assetSymbol?: string;
    symbolAsDecimal?: boolean;
    isFiatValue?: boolean;
    fiatDefaultRounding?: boolean;
    valueCanBeHidden?: boolean;
    integerOnly?: boolean;
    withLeftShift?: boolean;
    customizableCurrency?: Currency | '';
  }>(),
  {
    value: '',
    fontSizeRate: FontSizeRate.NORMAL,
    fontWeightRate: FontWeightRate.NORMAL,
    assetSymbol: '',
    symbolAsDecimal: false,
    isFiatValue: false,
    fiatDefaultRounding: false,
    valueCanBeHidden: false,
    integerOnly: false,
    withLeftShift: false,
    customizableCurrency: '',
  }
);

const parent = ref<HTMLSpanElement | null>(null);
const child = ref<HTMLSpanElement | null>(null);
const isValueWider = ref(false);
const walletStore = useWalletStore();

const shouldBalanceBeHidden = computed(() => walletStore.shouldBalanceBeHidden);
const fiatExchangeRateObject = computed(() => walletStore.fiatExchangeRateObject);
const fiatPriceObject = computed(() => walletStore.fiatPriceObject);

const symbol = computed(() => {
  if (props.customizableCurrency) {
    return getCurrency(props.customizableCurrency)?.symbol ?? DaiCurrency.symbol;
  }
  const currency = walletStore.currency ?? Currency.DAI;
  return getCurrency(currency)?.symbol ?? DaiCurrency.symbol;
});

const exchangeRate = computed(() => {
  const currency = walletStore.currency ?? Currency.DAI;
  if (currency === Currency.XOR) {
    const xorPriceCodec = fiatPriceObject.value[XOR.address];
    const xorPrice = FPNumber.fromCodecValue(xorPriceCodec);
    return xorPrice.isGtZero() ? FPNumber.ONE.div(xorPrice).toNumber() : 1;
  }
  return fiatExchangeRateObject.value?.[currency] ?? 1;
});

const normalizedValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return '';
  }
  if (typeof props.value === 'string') {
    return props.value;
  }
  return String(props.value);
});

const hasDisplayableValue = computed(() => {
  if (typeof props.value === 'number') {
    return !Number.isNaN(props.value) && props.value !== 0;
  }
  return normalizedValue.value.trim().length > 0;
});

const unformatted = computed(() =>
  normalizedValue.value
    .replaceAll(FPNumber.DELIMITERS_CONFIG.thousand, '')
    .replace(FPNumber.DELIMITERS_CONFIG.decimal, '.')
);

const isFiniteValue = computed(() => {
  if (+normalizedValue.value !== Infinity) {
    return Number.isFinite(+unformatted.value);
  }
  return false;
});

const shouldRender = computed(() => hasDisplayableValue.value && isFiniteValue.value);

function formatFiatDecimal(integer: Nullable<string>, decimal: Nullable<string>): string {
  if (!decimal || !+decimal) {
    return '00';
  }
  if (decimal.length <= 2) {
    return decimal.length === 1 ? `${decimal}0` : decimal;
  }
  const isSmallNumber = (!integer || !+integer) && decimal.startsWith('00');
  if (isSmallNumber && props.fiatDefaultRounding) {
    return decimal;
  }
  return decimal.length === 1 ? `${decimal}0` : decimal.substring(0, 2);
}

const formatted = computed(() => {
  if (!shouldRender.value) {
    return {
      integer: '',
      decimal: '',
    };
  }

  let value = normalizedValue.value;

  if (props.isFiatValue) {
    let coefficient = exchangeRate.value;

    if (props.customizableCurrency) {
      if (props.customizableCurrency !== Currency.XOR) {
        coefficient = fiatExchangeRateObject.value?.[props.customizableCurrency] ?? 1;
      } else {
        const xorPriceCodec = fiatPriceObject.value[XOR.address];
        const xorPrice = FPNumber.fromCodecValue(xorPriceCodec);
        coefficient = xorPrice.isGtZero() ? FPNumber.ONE.div(xorPrice).toNumber() : 1;
      }
    }

    value = new FPNumber(unformatted.value).mul(coefficient).toLocaleString();
  }

  let [integer, decimal] = value.split(FPNumber.DELIMITERS_CONFIG.decimal);

  if (!props.integerOnly) {
    if (props.isFiatValue) {
      decimal = formatFiatDecimal(integer, decimal);
    }

    decimal = decimal ? FPNumber.DELIMITERS_CONFIG.decimal + decimal : `${FPNumber.DELIMITERS_CONFIG.decimal}0`;
  }

  return {
    integer,
    decimal,
  };
});

const isHiddenValue = computed(() => props.valueCanBeHidden && shouldBalanceBeHidden.value);

const computedClasses = computed(() => {
  const baseClass = 'formatted-amount';
  const classes = [baseClass];

  if (props.fontSizeRate !== FontSizeRate.NORMAL) {
    classes.push(`${baseClass}--font-size-${props.fontSizeRate}`);
  }

  if (props.fontWeightRate !== FontWeightRate.NORMAL) {
    classes.push(`${baseClass}--font-weight-${props.fontWeightRate}`);
  }

  if (props.assetSymbol && props.symbolAsDecimal) {
    classes.push(`${baseClass}--symbol-as-decimal`);
  }

  if (props.isFiatValue) {
    classes.push(`${baseClass}--fiat-value`);
  }

  if (props.withLeftShift) {
    classes.push(`${baseClass}--shifted`);
  }

  if (isValueWider.value) {
    classes.push(`${baseClass}--value-wider`);
  }

  return classes.join(' ');
});

function checkWiderFlag(): void {
  const parentEl = parent.value;
  const childEl = child.value;

  if (!parentEl || !childEl) return;

  if (childEl.offsetWidth > parentEl.offsetWidth) {
    isValueWider.value = true;
  }
}

function resetWiderFlag(): void {
  isValueWider.value = false;
}
</script>

<style scoped lang="scss">
$formatted-amount-class: '.formatted-amount';

#{$formatted-amount-class} {
  display: block;
  overflow-wrap: break-word;
  word-break: break-all;
  // Trick to fix horizontal spacings bug between elements
  &__value {
    word-spacing: -3px;
    // NOTE: use left-to-right texting direction including arabic langs; remove it if support is needed.
    unicode-bidi: bidi-override;
    direction: ltr;
  }
  &__integer {
    word-spacing: normal;
  }
  &__decimal {
    word-spacing: -3px;
  }
  &--fiat-value {
    color: var(--s-color-fiat-value);
    font-family: var(--s-font-family-default);
    font-weight: 400;
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
  }
  &--symbol-as-decimal {
    #{$formatted-amount-class}__symbol {
      margin-left: $basic-spacing-mini;
    }
  }
  #{$formatted-amount-class}__decimal:not(:last-child) {
    margin-right: $basic-spacing-mini;
  }
  #{$formatted-amount-class}__symbol {
    white-space: nowrap;
  }
  &--font-size {
    &-medium {
      #{$formatted-amount-class}__decimal {
        font-size: 0.875em;
      }
    }
    &-small {
      #{$formatted-amount-class}__decimal {
        font-size: 0.777em;
      }
    }
  }
  &--font-weight {
    &-medium {
      #{$formatted-amount-class}__prefix {
        font-weight: 800;
      }
      #{$formatted-amount-class}__integer {
        font-weight: 600;
      }
      #{$formatted-amount-class}__decimal {
        font-weight: 300;
      }
    }
    &-small {
      &:not(#{$formatted-amount-class}--fiat-value) {
        font-weight: 400;
        font-size: var(--s-font-size-extra-small);
        #{$formatted-amount-class}__integer,
        #{$formatted-amount-class}__symbol {
          font-weight: 600;
        }
      }
    }
  }
  &--shifted {
    margin-left: $basic-spacing-mini;
  }
  &__prefix {
    opacity: 0.6;
    padding-right: #{$basic-spacing-extra-mini};
  }
}
</style>
