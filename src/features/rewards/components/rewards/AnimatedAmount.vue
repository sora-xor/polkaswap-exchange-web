<template>
  <formatted-amount
    :value="shown"
    :is-fiat-value="isFiatValue"
    :asset-symbol="assetSymbol"
    :symbol-as-decimal="symbolAsDecimal"
    :value-can-be-hidden="valueCanBeHidden"
    :font-size-rate="fontSizeRate"
    :font-weight-rate="fontWeightRate"
    :fiat-default-rounding="fiatDefaultRounding"
  ></formatted-amount>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { computed } from 'vue';

import { useCountUp } from '@/features/rewards/composables/useCountUp';
import { parseAmount } from '@/features/rewards/utils/analytics';
import { FontSizeRate, FontWeightRate } from '@/lib/soraneo-wallet/src/consts';

import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';

/**
 * An amount that counts up to its value. It renders through the wallet's `FormattedAmount`, so currency conversion,
 * decimals and hidden-balance mode behave exactly like every other amount in the app.
 *
 * `value` is a natural decimal string (`'1234.5'`). Anything that is not a number renders nothing.
 */
defineOptions({
  name: 'RewardsAnimatedAmount',
  components: {
    FormattedAmount: WalletComponentFormattedAmount,
  },
});

const props = withDefaults(
  defineProps<{
    value?: string;
    assetSymbol?: string;
    isFiatValue?: boolean;
    symbolAsDecimal?: boolean;
    valueCanBeHidden?: boolean;
    fiatDefaultRounding?: boolean;
    fontSizeRate?: string;
    fontWeightRate?: string;
    duration?: number;
  }>(),
  {
    value: '',
    assetSymbol: '',
    isFiatValue: false,
    symbolAsDecimal: false,
    valueCanBeHidden: false,
    fiatDefaultRounding: false,
    fontSizeRate: FontSizeRate.NORMAL,
    fontWeightRate: FontWeightRate.NORMAL,
    duration: 900,
  }
);

const target = computed<FPNumber | null>(() => parseAmount(props.value));

const counted = useCountUp(target, { duration: props.duration });

/**
 * `FormattedAmount` reads its value with the delimiters of the app language (`1.234,5` in German) and, for fiat,
 * then applies the currency, exchange rate and rounding. So both kinds are handed over locale-formatted: a plain
 * `1234.5` would be read as 12345 wherever `.` groups thousands.
 */
const shown = computed(() => (counted.value ? new FPNumber(counted.value).toLocaleString() : counted.value));
</script>
