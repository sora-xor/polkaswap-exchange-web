<template>
  <section class="market-detail">
    <div v-if="!market" class="market-detail__empty">
      {{ t('polkamarkt.details.empty') }}
    </div>

    <template v-else>
      <header class="market-detail__header">
        <span>{{ market.category }}</span>
        <h1>{{ market.title }}</h1>
        <p>{{ market.description }}</p>
      </header>

      <market-outcome-chart
        :market="market"
        :points="history"
        :loading="historyLoading"
      >
        <template #actions>
          <market-share-widget compact :market="market" :history="history" />
        </template>
      </market-outcome-chart>

      <div class="market-detail__grid">
        <div class="metric metric--accent">
          <span>{{ t('polkamarkt.metrics.yesQuote') }}</span>
          <strong>{{ formatPrice(prices.yes) }}</strong>
        </div>
        <div class="metric">
          <span>{{ t('polkamarkt.metrics.noQuote') }}</span>
          <strong>{{ formatPrice(prices.no) }}</strong>
        </div>
        <div class="metric">
          <span>{{ t('polkamarkt.metrics.liquidity') }}</span>
          <strong>{{ formatUsd(market.liquidity) }}</strong>
        </div>
        <div class="metric">
          <span>{{ t('polkamarkt.metrics.volume') }}</span>
          <strong>{{ formatUsd(market.volume) }}</strong>
        </div>
        <div class="metric">
          <span>{{ t('polkamarkt.metrics.closeBlock') }}</span>
          <strong>{{ market.closeBlock ? Number(market.closeBlock).toLocaleString() : t('polkamarkt.notIndexed') }}</strong>
          <small v-if="closeDate">{{ closeDate }}</small>
        </div>
        <div class="metric">
          <span>{{ t('polkamarkt.metrics.status') }}</span>
          <strong>{{ market.status || t('polkamarkt.status.active') }}</strong>
        </div>
      </div>

      <div class="market-detail__sections">
        <section>
          <h3>{{ t('polkamarkt.details.oracle') }}</h3>
          <dl>
            <div>
              <dt>{{ t('polkamarkt.fields.oracle') }}</dt>
              <dd>{{ market.oracle || t('polkamarkt.notIndexed') }}</dd>
            </div>
            <div>
              <dt>{{ t('polkamarkt.fields.resolutionSource') }}</dt>
              <dd>
                <a v-if="isUrl(market.resolutionSource)" :href="market.resolutionSource" target="_blank" rel="noreferrer">
                  {{ t('polkamarkt.details.openResolutionSource') }}
                </a>
                <template v-else>{{ market.resolutionSource || t('polkamarkt.notIndexed') }}</template>
              </dd>
            </div>
            <div>
              <dt>{{ t('polkamarkt.fields.conditionId') }}</dt>
              <dd>{{ formatOptionalNumber(market.conditionId) }}</dd>
            </div>
            <div>
              <dt>{{ t('polkamarkt.fields.collateralAsset') }}</dt>
              <dd>{{ market.collateralAsset || collateralSymbol }}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>{{ t('polkamarkt.details.pool') }}</h3>
          <dl>
            <div>
              <dt>{{ t('polkamarkt.fields.poolCollateral') }}</dt>
              <dd>{{ formatPoolAmount(market.pool?.collateral, collateralSymbol) }}</dd>
            </div>
            <div>
              <dt>{{ t('polkamarkt.fields.yesReserve') }}</dt>
              <dd>{{ formatPoolAmount(market.pool?.yes, t('polkamarkt.units.shares')) }}</dd>
            </div>
            <div>
              <dt>{{ t('polkamarkt.fields.noReserve') }}</dt>
              <dd>{{ formatPoolAmount(market.pool?.no, t('polkamarkt.units.shares')) }}</dd>
            </div>
            <div>
              <dt>{{ t('polkamarkt.fields.lpShares') }}</dt>
              <dd>{{ formatPoolAmount(market.liquidityShares, t('polkamarkt.units.shares')) }}</dd>
            </div>
            <div>
              <dt>{{ t('polkamarkt.fields.lpContributed') }}</dt>
              <dd>{{ formatPoolAmount(market.liquidityCollateralContributed, collateralSymbol) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { POLKAMARKT_COLLATERAL_ASSET } from '../consts';
import { calculateApproximateCloseDate, yesNoPricesFromProbability } from '../lib/markets';
import MarketOutcomeChart from './MarketOutcomeChart.vue';
import MarketShareWidget from './MarketShareWidget.vue';

import type { MarketHistoryPoint, PolkamarktMarket } from '../types';

const props = defineProps<{
  market?: PolkamarktMarket;
  history?: MarketHistoryPoint[];
  historyLoading?: boolean;
  currentBlock?: number;
}>();

const { t } = useTranslation();
const collateralSymbol = POLKAMARKT_COLLATERAL_ASSET.symbol;

const prices = computed(() => yesNoPricesFromProbability(props.market?.probability));
const closeDate = computed(() => {
  const date = calculateApproximateCloseDate(props.currentBlock ?? 0, props.market?.closeBlock);
  return date ? date.toLocaleString() : '';
});
const isUrl = (value?: string): boolean => /^https?:\/\//i.test(value ?? '');

const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

const formatPrice = (value?: number): string =>
  Number.isFinite(value) ? `${(value ?? 0).toFixed(2)} ${collateralSymbol}` : t('polkamarkt.notIndexed');

const formatOptionalNumber = (value?: number): string =>
  Number.isFinite(value) ? Number(value).toLocaleString() : t('polkamarkt.notIndexed');

const formatPoolAmount = (value?: number, unit = ''): string =>
  Number.isFinite(value)
    ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value ?? 0)} ${unit}`.trim()
    : t('polkamarkt.notIndexed');
</script>

<style lang="scss" scoped>
.market-detail {
  min-width: 0;

  &__empty {
    display: grid;
    min-height: 260px;
    place-items: center;
    border: 1px dashed var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    color: var(--s-color-base-content-secondary);
    text-align: center;
    padding: $inner-spacing-big;
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: $inner-spacing-mini;
    margin-bottom: $inner-spacing-big;

    span {
      color: var(--s-color-theme-accent);
      font-weight: 700;
      font-size: var(--s-font-size-mini);
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: var(--s-heading2-font-size);
      line-height: 1.2;
      letter-spacing: 0;
    }

    p {
      margin: 0;
      color: var(--s-color-base-content-secondary);
      line-height: 1.7;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $inner-spacing-mini;
    margin-bottom: $inner-spacing-big;

    @include tablet(true) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__sections {
    display: grid;
    gap: $inner-spacing-medium;

    section {
      border-top: 1px solid var(--s-color-base-border-secondary);
      padding-top: $inner-spacing-medium;
    }

    h3 {
      margin: 0 0 $inner-spacing-mini;
      font-size: var(--s-heading6-font-size);
    }

    dl {
      display: grid;
      gap: $inner-spacing-small;
      margin: 0;
    }

    div {
      display: grid;
      grid-template-columns: minmax(120px, 0.45fr) minmax(0, 1fr);
      gap: $inner-spacing-mini;
      min-width: 0;

      @include tablet(true) {
        grid-template-columns: 1fr;
      }
    }

    dt {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
    }

    dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
      font-weight: 600;
    }

    a {
      color: var(--s-color-theme-accent);
    }
  }
}

.metric {
  min-width: 0;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-surface);
  padding: $inner-spacing-medium;

  span,
  small {
    display: block;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
  }

  strong {
    display: block;
    margin-top: $inner-spacing-tiny;
    font-size: var(--s-heading5-font-size);
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  &--accent strong {
    color: var(--s-color-theme-accent);
  }
}
</style>
