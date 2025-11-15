<template>
  <div class="amount-header">
    <div v-for="{ asset, amount } in items" :key="asset.symbol" class="amount-block">
      <formatted-amount
        class="amount-block__amount"
        symbol-as-decimal
        value-can-be-hidden
        :value="formatStringValue(amount, asset.decimals)"
        :font-size-rate="FontSizeRate.MEDIUM"
        :asset-symbol="asset.symbol"
      ></formatted-amount>
    </div>
    <formatted-amount
      v-if="totalFiatValue"
      is-fiat-value
      value-can-be-hidden
      :value="totalFiatValue"
    ></formatted-amount>
  </div>
</template>

<script lang="ts" setup>
import { components, WALLET_CONSTS } from '@wallet';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import type { RewardsAmountHeaderItem } from '@/types/rewards';

import type { FPNumber } from '@sora-substrate/math';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  name: 'RewardsAmountHeader',
  components: {
    FormattedAmount: components.FormattedAmount,
  },
});

const props = withDefaults(
  defineProps<{
    items?: RewardsAmountHeaderItem[];
  }>(),
  {
    items: () => [],
  }
);

const FontSizeRate = WALLET_CONSTS.FontSizeRate;

const { getFPNumberFiatAmountByFPNumber, getFPNumber, Zero } = useFormattedAmount();
const { formatStringValue } = useNumberFormatter();

const totalFiatValue = computed(() => {
  const value = props.items.reduce<Nullable<FPNumber>>((result, item) => {
    if (!item.amount || !item.asset) return result;

    const fpAmount = getFPNumber(item.amount);
    if (!fpAmount) return result;

    const fpFiatAmount = getFPNumberFiatAmountByFPNumber(fpAmount, item.asset as Asset);
    if (!fpFiatAmount) return result;

    const accumulator = result ?? Zero;
    return accumulator.add(fpFiatAmount);
  }, null);

  return value?.toLocaleString();
});

defineExpose({
  totalFiatValue,
});
</script>

<style lang="scss">
.amount {
  &-header {
    .formatted-amount__container {
      justify-content: center;
      text-align: center;
    }
  }

  &-block {
    &__amount,
    .formatted-amount--fiat-value {
      font-weight: 700;
    }

    .formatted-amount--fiat-value {
      font-size: 0.875em;
    }
  }
}
</style>

<style lang="scss" scoped>
$amount-line-height: 20px;

.amount {
  &-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  &-block {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    justify-content: center;
    line-height: $amount-line-height;
    text-align: center;
    font-size: var(--s-font-size-large);

    &:first-child:not(:last-child) {
      text-align: right;
    }

    &:last-child:not(:first-child) {
      text-align: left;
    }
  }
}
</style>
