<template>
  <div class="amount-header">
    <div class="amount-header__figure" :data-state="figureState">
      <animated-amount
        v-if="totalFiat"
        class="amount-header__total"
        is-fiat-value
        value-can-be-hidden
        :value="totalFiat.toString()"
        :font-size-rate="FontSizeRate.MEDIUM"
      ></animated-amount>
      <animated-amount
        v-else-if="primary"
        class="amount-header__total"
        symbol-as-decimal
        value-can-be-hidden
        :value="primary.amount"
        :asset-symbol="primary.asset.symbol"
        :font-size-rate="FontSizeRate.MEDIUM"
      ></animated-amount>
      <animated-amount
        v-else
        class="amount-header__total"
        is-fiat-value
        value-can-be-hidden
        value="0"
        :font-size-rate="FontSizeRate.MEDIUM"
      ></animated-amount>
    </div>
    <ul v-if="chipItems.length" class="amount-header__tokens">
      <li v-for="{ asset, amount } in chipItems" :key="asset.symbol" class="amount-block">
        <token-logo class="amount-block__logo" :token="asset" :size="LogoSize.MINI"></token-logo>
        <animated-amount
          v-if="amount"
          class="amount-block__amount"
          symbol-as-decimal
          value-can-be-hidden
          :value="amount"
          :asset-symbol="asset.symbol"
          :font-size-rate="FontSizeRate.MEDIUM"
        ></animated-amount>
        <span v-else class="amount-block__symbol">{{ asset.symbol }}</span>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { FontSizeRate, LogoSize } from '@/lib/soraneo-wallet/src/consts';
import type { RewardsAmountHeaderItem } from '@/types/rewards';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import AnimatedAmount from './AnimatedAmount.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

/**
 * The number block at the top of the rewards hero: one total in the user's currency and a chip per token.
 *
 * The total counts up whenever it changes (for example when a source is ticked or unticked). Without prices the
 * first token's amount takes the big slot instead, and with nothing to claim it reads as zero, so the block never
 * shows a wrong or empty headline.
 */
defineOptions({
  name: 'RewardsAmountHeader',
  components: {
    TokenLogo: WalletComponentTokenLogo,
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

const { getFPNumberFiatAmountByFPNumber, getFPNumber, Zero } = useFormattedAmount();

const totalFiat = computed<FPNumber | null>(() => {
  return (
    props.items.reduce<Nullable<FPNumber>>((result, item) => {
      if (!item.amount || !item.asset) return result;

      const fpAmount = getFPNumber(item.amount);
      if (!fpAmount) return result;

      const fpFiatAmount = getFPNumberFiatAmountByFPNumber(fpAmount, item.asset as Asset);
      if (!fpFiatAmount) return result;

      const accumulator = result ?? Zero;
      return accumulator.add(fpFiatAmount);
    }, null) ?? null
  );
});

const totalFiatValue = computed(() => totalFiat.value?.toLocaleString());

const primary = computed(() => props.items.find((item) => item.amount && item.asset) ?? null);
/** Chips list the tokens that have an amount; the token in the big slot (no prices) is not repeated. */
const chipItems = computed(() =>
  props.items.filter((item) => item.amount && item.asset && (totalFiat.value || item !== primary.value))
);
const figureState = computed(() => (totalFiat.value ? 'fiat' : primary.value ? 'token' : 'zero'));

defineExpose({
  totalFiatValue,
});
</script>

<style lang="scss">
.amount-header {
  display: flex;
  flex-direction: column;
  align-items: inherit;
  gap: $inner-spacing-small;
  min-width: 0;

  // The one hero figure of the page: same sans as everything else, proportional digits.
  // `.formatted-amount` doubles the specificity, so the wallet's own fiat-value color and weight do not win.
  &__total.formatted-amount {
    display: block;
    font-size: clamp(2.5rem, 7vw, 3.75rem);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--rw-hero-ink, #fff);

    .formatted-amount__decimal {
      font-weight: 400;
      opacity: 0.62;
    }

    .formatted-amount__prefix {
      margin-inline-end: 0.04em;
      opacity: 0.7;
    }

    .formatted-amount__symbol {
      font-size: 0.4em;
      font-weight: 600;
      letter-spacing: 0;
      opacity: 0.8;
    }
  }

  &__tokens {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-mini;
    margin: 0;
    padding: 0;
    list-style: none;
  }
}

.amount-block {
  display: inline-flex;
  align-items: center;
  gap: $inner-spacing-mini;
  padding: 6px;
  padding-inline: 8px 14px;
  border: 1px solid var(--rw-hero-line, rgba(255, 255, 255, 0.16));
  border-radius: 999px;
  background: var(--rw-hero-glass, rgba(255, 255, 255, 0.07));
  color: var(--rw-hero-ink, #fff);
  font-size: var(--s-font-size-small);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.12);
  }

  &__logo {
    flex: 0 0 auto;
  }

  &__amount {
    font-weight: 600;

    .formatted-amount__decimal {
      font-weight: 300;
      opacity: 0.7;
    }

    .formatted-amount__symbol {
      font-weight: 400;
      opacity: 0.75;
    }
  }

  &__symbol {
    font-weight: 600;
    opacity: 0.8;
  }
}

@media (prefers-reduced-motion: reduce) {
  .amount-block {
    transition: none;

    &:hover {
      transform: none;
    }
  }
}
</style>
