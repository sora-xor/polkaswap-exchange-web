<template>
  <span class="rw-value">
    <formatted-amount
      v-if="showFiat"
      is-fiat-value
      value-can-be-hidden
      fiat-default-rounding
      :value="fiat?.toLocaleString()"
    ></formatted-amount>
    <template v-else>
      <formatted-amount
        v-for="{ asset, amount } in amounts"
        :key="asset.address"
        symbol-as-decimal
        value-can-be-hidden
        :value="amount.toLocaleString()"
        :asset-symbol="asset.symbol"
      ></formatted-amount>
    </template>
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import type { RewardAmount } from '@/features/rewards/utils/analytics';

import type { FPNumber } from '@sora-substrate/sdk';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';

/**
 * A reward value as the user reads it: in their currency when every token is priced, otherwise the token amounts.
 */
defineOptions({
  name: 'RewardsSegmentValue',
  components: {
    FormattedAmount: WalletComponentFormattedAmount,
  },
});

const props = withDefaults(
  defineProps<{
    amounts?: RewardAmount[];
    fiat?: FPNumber | null;
    /** Prefer fiat when it exists. Set to false to always list token amounts. */
    preferFiat?: boolean;
  }>(),
  {
    amounts: () => [],
    fiat: null,
    preferFiat: true,
  }
);

const showFiat = computed(() => props.preferFiat && Boolean(props.fiat));
</script>

<style lang="scss">
.rw-value {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0 $inner-spacing-small;
  font-variant-numeric: tabular-nums;

  .formatted-amount {
    display: inline;
  }

  .formatted-amount--fiat-value {
    color: inherit;
    font-weight: inherit;
    line-height: inherit;
  }
}
</style>
