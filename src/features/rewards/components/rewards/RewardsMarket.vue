<template>
  <section class="rw-card rw-market" :style="{ '--rw-i': index }" :aria-labelledby="titleId">
    <header class="rw-card__head">
      <h3 :id="titleId" class="rw-card__title">{{ t('rewards.analytics.market.title') }}</h3>
      <button
        v-if="points.length"
        type="button"
        class="rw-card__toggle"
        :aria-pressed="tableView"
        @click="tableView = !tableView"
      >
        {{ t('rewards.analytics.showTable') }}
      </button>
    </header>

    <div
      v-if="tokens.length > 1"
      class="rw-market__tokens"
      role="group"
      :aria-label="t('rewards.analytics.market.title')"
    >
      <button
        v-for="token in tokens"
        :key="token.address"
        type="button"
        class="rw-market__token"
        :class="{ 'is-active': token.address === selected?.address }"
        :aria-pressed="token.address === selected?.address"
        @click="select(token.address)"
      >
        <token-logo :token="token" :size="LogoSize.MINI"></token-logo>
        {{ token.symbol }}
      </button>
    </div>

    <template v-if="selected">
      <div class="rw-market__stats">
        <div v-if="priceText || !waiting" class="rw-market__price">
          <span class="rw-market__figure">{{ priceText || '–' }}</span>
          <span class="rw-market__symbol">{{ selected.symbol }}</span>
        </div>
        <div v-else class="rw-skeleton rw-market__figure-skeleton" aria-hidden="true"></div>
        <ul v-if="deltas.length" class="rw-market__deltas">
          <li v-for="delta in deltas" :key="delta.label" class="rw-delta" :class="`rw-delta--${delta.direction}`">
            <svg class="rw-delta__icon" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
              <path v-if="delta.direction === 'up'" d="M5 1.5 9 8H1z" />
              <path v-else-if="delta.direction === 'down'" d="M5 8.5 1 2h8z" />
              <path v-else d="M1.5 4.25h7v1.5h-7z" />
            </svg>
            <span class="rw-delta__value">{{ delta.text }}</span>
            <span class="rw-delta__label">{{ delta.label }}</span>
          </li>
        </ul>
      </div>

      <rewards-price-chart
        v-if="points.length"
        :points="displayPoints"
        :symbol="currencySymbol"
        :label="chartLabel"
        :locale="dateLocale"
        :loading="status === 'loading'"
        :table-view="tableView"
        :date-heading="t('transaction.startTime')"
        :price-heading="t('rewards.analytics.market.title')"
      ></rewards-price-chart>
      <div v-else-if="waiting" class="rw-skeleton rw-market__chart-skeleton" aria-hidden="true"></div>
      <div v-else class="rw-market__error" role="status">
        <p class="rw-card__ghost">{{ t('rewards.analytics.market.unavailable') }}</p>
        <button type="button" class="rw-card__toggle" @click="reload">{{ t('retryText') }}</button>
      </div>

      <p v-if="points.length" class="rw-card__note">{{ t('rewards.analytics.market.period') }}</p>
    </template>
  </section>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { computed, ref, useId, toRef } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useRewardsMarket } from '@/features/rewards/composables/useRewardsMarket';
import { getAssetPrice } from '@/features/rewards/utils/analytics';
import {
  formatPrice,
  formatSignedPercent,
  getChangeDirection,
  resolveDateLocale,
  type ChangeDirection,
  type PricePoint,
} from '@/features/rewards/utils/market';
import { LogoSize } from '@/lib/soraneo-wallet/src/consts';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import RewardsPriceChart from './RewardsPriceChart.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

/**
 * Market context for the reward tokens: price now, 24 hour and 7 day change, and a 30 day price chart.
 *
 * Works without an account (the tokens default to PSWAP and VAL). The headline price is the wallet's live price,
 * shown in the user's currency like every other amount; the indexer supplies the changes and the daily history.
 * If the indexer cannot be reached the card says so and offers a retry instead of showing stale or partial numbers.
 */
defineOptions({
  name: 'RewardsMarket',
  components: {
    TokenLogo: WalletComponentTokenLogo,
  },
});

const props = withDefaults(
  defineProps<{
    /** Reward tokens, most important first. */
    assets?: Asset[];
    /** Position in the column, used to stagger the entrance. */
    index?: number;
  }>(),
  {
    assets: () => [],
    index: 0,
  }
);

interface Delta {
  label: string;
  text: string;
  direction: ChangeDirection;
}

const { t } = useTranslation();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const titleId = `rw-market-${useId()}`;
const tableView = ref(false);

const endpoint = computed(() => {
  const type = walletStore.indexerType;

  return type ? (walletStore.indexers?.[type]?.endpoint ?? '') : '';
});

const { tokens, selected, status, stats, points, select, reload } = useRewardsMarket(toRef(props, 'assets'), endpoint);

/** A request is running or about to start; the card shows shimmer placeholders only then, never after a failure. */
const waiting = computed(() => status.value === 'loading' || status.value === 'idle');

const dateLocale = computed(() => resolveDateLocale(settingsStore.language));
const rate = computed(() => walletStore.exchangeRate || 1);
const currencySymbol = computed(() => walletStore.currencySymbol ?? '$');

/** Live wallet price first, the indexer's last known price second. */
const price = computed<FPNumber | null>(
  () => getAssetPrice(walletStore.fiatPriceObject, selected.value) ?? stats.value?.priceUSD ?? null
);
const priceText = computed(() =>
  price.value?.isGtZero() ? formatPrice(price.value.mul(rate.value), currencySymbol.value) : ''
);

const deltas = computed<Delta[]>(() => {
  const data = stats.value;

  if (!data) return [];

  return [
    { label: t('rewards.analytics.market.day'), change: data.priceChangeDay },
    { label: t('rewards.analytics.market.week'), change: data.priceChangeWeek },
  ].map(({ label, change }) => {
    // FPNumber rounds toward minus infinity, which would turn -0.004 into -0.01 but +0.004 into 0.
    // Keep extra digits here and let the formatter round symmetrically.
    const value = change.toNumber(6);

    return { label, text: formatSignedPercent(value), direction: getChangeDirection(value) };
  });
});

/** The chart is drawn in the display currency. Only line geometry uses this plain-number scaling. */
const displayPoints = computed<PricePoint[]>(() =>
  points.value.map((point) => ({ time: point.time, price: point.price * rate.value }))
);

const chartLabel = computed(() => `${selected.value?.symbol ?? ''} – ${t('rewards.analytics.market.period')}`);
</script>

<style lang="scss">
.rw-market {
  &__tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: $inner-spacing-small;
  }

  &__token {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px 4px 6px;
    border: 1px solid var(--rw-line, #ede4e7);
    border-radius: 999px;
    background: transparent;
    color: var(--rw-muted, #6e6168);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      color: var(--rw-ink, #2a171f);
    }

    &.is-active {
      border-color: color-mix(in srgb, var(--rw-accent, #d8267a) 55%, transparent);
      background: color-mix(in srgb, var(--rw-accent, #d8267a) 10%, transparent);
      color: var(--rw-ink, #2a171f);
    }

    &:focus-visible {
      outline: 2px solid var(--s-color-focus-ring, #ab0555);
      outline-offset: 2px;
    }
  }

  &__stats {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px $inner-spacing-small;
    margin-bottom: $inner-spacing-small;
  }

  &__price {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  // A stat value, well below the hero figure: proportional digits, semibold.
  &__figure {
    color: var(--rw-ink, #2a171f);
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  &__symbol {
    color: var(--rw-muted, #6e6168);
    font-size: 12px;
    font-weight: 600;
  }

  &__figure-skeleton {
    width: 140px;
    height: 30px;
  }

  &__deltas {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__chart-skeleton {
    height: 128px;
  }

  &__error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $inner-spacing-small;
    min-height: 128px;

    .rw-card__ghost {
      padding: 0;
    }
  }
}

// Direction is never color alone: an arrow and a signed value come with it.
.rw-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--rw-muted, #6e6168);

  &--up {
    color: var(--rw-up, #006300);
  }

  &--down {
    color: var(--rw-down, #b42318);
  }

  &__icon {
    width: 9px;
    height: 9px;
    fill: currentColor;
  }

  // A signed number keeps its sign in front in every language.
  &__value {
    direction: ltr;
    unicode-bidi: isolate;
  }

  &__label {
    color: var(--rw-muted, #6e6168);
    font-weight: 500;
  }
}
</style>
