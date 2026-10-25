<template>
  <section class="market-detail">
    <div v-if="!market" class="market-detail__empty">
      {{ t('polkamarkt.details.empty') }}
    </div>

    <template v-else>
      <header class="market-detail__header">
        <div class="market-detail__context">
          <span>{{ market.category }}</span>
          <span>{{ marketStatus }}</span>
        </div>
        <h1>{{ getMarketQuestion(market.title) }}</h1>
      </header>

      <details class="market-detail__rules" data-testid="market-rules">
        <summary>{{ t('polkamarkt.details.rules') }}</summary>
        <div class="market-detail__rules-content">
          <p>{{ market.title }}</p>
          <p v-if="market.description && market.description !== market.title">{{ market.description }}</p>
        </div>
      </details>

      <pricing-curve-position-chart v-if="isDpm" :market="market" />

      <dl class="market-detail__metrics">
        <div class="market-detail__metric">
          <dt>{{ t('polkamarkt.metrics.volume') }}</dt>
          <dd>{{ formatUsd(market.volume) }}</dd>
        </div>
        <div class="market-detail__metric">
          <dt>{{ t('polkamarkt.metrics.liquidity') }}</dt>
          <dd>{{ formatUsd(market.liquidity) }}</dd>
        </div>
        <div class="market-detail__metric">
          <dt>{{ t('polkamarkt.metrics.closeBlock') }}</dt>
          <dd>
            {{ market.closeBlock ? Number(market.closeBlock).toLocaleString() : t('polkamarkt.notIndexed') }}
            <small v-if="closeDate">{{ closeDate }}</small>
          </dd>
        </div>
      </dl>

      <market-outcome-chart :market="market" :points="history" :loading="historyLoading">
        <template #actions>
          <market-share-widget compact :market="market" :history="history" :current-block="currentBlock" />
        </template>
      </market-outcome-chart>

      <div class="market-detail__sections">
        <details class="market-detail__section">
          <summary>
            <h3>{{ t('polkamarkt.details.oracle') }}</h3>
          </summary>
          <dl class="market-detail__facts">
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.oracle') }}</dt>
              <dd>{{ market.oracle || t('polkamarkt.notIndexed') }}</dd>
            </div>
            <div class="market-detail__fact market-detail__fact--wide">
              <dt>{{ t('polkamarkt.fields.resolutionSource') }}</dt>
              <dd>
                <a
                  v-if="isUrl(market.resolutionSource)"
                  :href="market.resolutionSource"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ t('polkamarkt.details.openResolutionSource') }}
                </a>
                <template v-else>{{ market.resolutionSource || t('polkamarkt.notIndexed') }}</template>
              </dd>
            </div>
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.conditionId') }}</dt>
              <dd>{{ formatOptionalNumber(market.conditionId) }}</dd>
            </div>
            <div class="market-detail__fact market-detail__fact--wide market-detail__fact--code">
              <dt>{{ t('polkamarkt.fields.collateralAsset') }}</dt>
              <dd>{{ market.collateralAsset || collateralSymbol }}</dd>
            </div>
          </dl>
        </details>

        <details v-if="market.earlyResolutionOutcome" class="market-detail__section">
          <summary>
            <h3>{{ t('polkamarkt.details.earlyResolutionReport') }}</h3>
          </summary>
          <dl class="market-detail__facts">
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.reportedOutcome') }}</dt>
              <dd>{{ market.earlyResolutionOutcome }}</dd>
            </div>
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.bond') }}</dt>
              <dd>{{ formatStateAmount(market.earlyResolutionBond, collateralSymbol) }}</dd>
            </div>
            <div class="market-detail__fact market-detail__fact--wide">
              <dt>{{ t('polkamarkt.fields.evidenceUri') }}</dt>
              <dd>
                <a
                  v-if="isUrl(market.earlyResolutionEvidenceUri)"
                  :href="market.earlyResolutionEvidenceUri"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ market.earlyResolutionEvidenceUri }}
                </a>
                <template v-else>{{ market.earlyResolutionEvidenceUri || t('polkamarkt.notIndexed') }}</template>
              </dd>
            </div>
            <div class="market-detail__fact market-detail__fact--wide market-detail__fact--code">
              <dt>{{ t('polkamarkt.fields.evidenceHash') }}</dt>
              <dd>{{ market.earlyResolutionEvidenceHash || t('polkamarkt.notIndexed') }}</dd>
            </div>
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.evidenceBlock') }}</dt>
              <dd>{{ formatOptionalNumber(market.earlyResolutionEvidenceBlock) }}</dd>
            </div>
            <div class="market-detail__fact market-detail__fact--wide market-detail__fact--code">
              <dt>{{ t('polkamarkt.fields.reporter') }}</dt>
              <dd>{{ market.earlyResolutionReporter || t('polkamarkt.notIndexed') }}</dd>
            </div>
          </dl>
        </details>

        <details class="market-detail__section">
          <summary>
            <h3>{{ t('polkamarkt.fields.mechanism') }}</h3>
          </summary>
          <dl class="market-detail__facts">
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.mechanism') }}</dt>
              <dd>{{ market.mechanism || 'DynamicPariMutuel' }}</dd>
            </div>
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.creatorSeed') }}</dt>
              <dd>{{ formatStateAmount(market.virtualDepth, t('polkamarkt.units.shares')) }}</dd>
            </div>
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.poolCollateral') }}</dt>
              <dd>{{ formatStateAmount(market.dpmCollateral, collateralSymbol) }}</dd>
            </div>
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.yesReserve') }}</dt>
              <dd>{{ formatStateAmount(market.realYesShares, t('polkamarkt.units.shares')) }}</dd>
            </div>
            <div class="market-detail__fact">
              <dt>{{ t('polkamarkt.fields.noReserve') }}</dt>
              <dd>{{ formatStateAmount(market.realNoShares, t('polkamarkt.units.shares')) }}</dd>
            </div>
            <div class="market-detail__fact market-detail__fact--wide">
              <dt>{{ t('polkamarkt.fields.backing') }}</dt>
              <dd>{{ t('polkamarkt.details.completeSetBacking') }}</dd>
            </div>
          </dl>
        </details>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/** Keeps the market question scannable while exposing the complete on-chain rules before trading. */
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { POLKAMARKT_COLLATERAL_ASSET } from '../consts';
import { calculateApproximateCloseDate, formatApproximateCloseDate, getMarketDisplayStatus } from '../lib/markets';
import { isDpmMarket } from '../lib/pricingCurve';
import { getMarketQuestion } from '../lib/marketQuestion';
import MarketOutcomeChart from './MarketOutcomeChart.vue';
import MarketShareWidget from './MarketShareWidget.vue';
import PricingCurvePositionChart from './PricingCurvePositionChart.vue';

import type { MarketHistoryPoint, PolkamarktMarket } from '../types';

const props = defineProps<{
  market?: PolkamarktMarket;
  history?: MarketHistoryPoint[];
  historyLoading?: boolean;
  currentBlock?: number;
}>();

const { t } = useTranslation();
const collateralSymbol = POLKAMARKT_COLLATERAL_ASSET.symbol;

const isDpm = computed(() => isDpmMarket(props.market));
const marketStatus = computed(() => {
  const status = getMarketDisplayStatus(props.market, props.currentBlock);
  if (status?.toLowerCase() === 'closed') return t('polkamarkt.status.closed');
  if (status?.toLowerCase() === 'early report locked') return t('polkamarkt.status.earlyReportLocked');
  return status || t('polkamarkt.status.active');
});
const closeDate = computed(() => {
  const date = calculateApproximateCloseDate(props.currentBlock ?? 0, props.market?.closeBlock);
  return date ? formatApproximateCloseDate(date) : '';
});
const isUrl = (value?: string): boolean => /^https?:\/\//i.test(value ?? '');

const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

const formatOptionalNumber = (value?: number): string =>
  Number.isFinite(value) ? Number(value).toLocaleString() : t('polkamarkt.notIndexed');

const formatStateAmount = (value?: number, unit = ''): string =>
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
    margin-bottom: $inner-spacing-small;

    h1 {
      margin: 0;
      font-size: var(--s-heading3-font-size);
      line-height: 1.35;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }
  }

  &__context {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $inner-spacing-small;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);

    span + span::before {
      content: '\00b7';
      margin-inline-end: $inner-spacing-small;
    }
  }

  &__rules {
    margin-bottom: $inner-spacing-big;

    summary {
      width: fit-content;
      min-height: 36px;
      padding-block: $inner-spacing-mini;
      color: var(--s-color-theme-accent);
      font-weight: 600;
      cursor: pointer;
      border-radius: var(--s-border-radius-mini);

      &:focus-visible {
        outline: 2px solid var(--s-color-theme-accent);
        outline-offset: 4px;
      }
    }
  }

  &__rules-content {
    max-width: 78ch;
    margin-top: $inner-spacing-mini;
    padding-inline-start: $inner-spacing-medium;
    border-inline-start: 2px solid var(--s-color-base-border-secondary);
    color: var(--s-color-base-content-secondary);
    line-height: 1.7;
    overflow-wrap: anywhere;

    p {
      margin: 0;
      white-space: pre-line;
    }

    p + p {
      margin-top: $inner-spacing-small;
    }
  }

  &__metrics {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-medium $inner-spacing-big;
    margin: $inner-spacing-medium 0 $inner-spacing-big;
    padding-bottom: $inner-spacing-small;
  }

  &__metric {
    min-width: 0;

    dt,
    small {
      display: block;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      font-weight: 400;
    }

    dd {
      margin: $inner-spacing-tiny 0 0;
      font-weight: 600;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
  }

  &__sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 340px), 1fr)'});
    align-items: start;
    gap: $inner-spacing-medium $inner-spacing-big;

    @include tablet(true) {
      gap: $inner-spacing-medium;
    }
  }

  &__section {
    display: grid;
    align-self: start;
    gap: $inner-spacing-mini;
    min-width: 0;
    border-top: 1px solid var(--s-color-base-border-secondary);
    padding-top: $inner-spacing-medium;

    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $inner-spacing-small;
      min-width: 0;
      cursor: pointer;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }

      &::after {
        content: '+';
        flex: 0 0 auto;
        color: var(--s-color-theme-accent);
        font-size: var(--s-heading5-font-size);
        font-weight: 700;
        line-height: 1;
      }
    }

    &[open] summary::after {
      content: '-';
    }

    h3 {
      margin: 0;
      font-size: var(--s-heading6-font-size);
    }
  }

  &__facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 150px), 1fr)'});
    gap: $inner-spacing-small $inner-spacing-medium;
    margin: 0;
  }

  &__fact {
    display: flex;
    flex-direction: column;
    gap: $inner-spacing-tiny;
    min-width: 0;

    &--wide {
      grid-column: span 2;

      @include tablet(true) {
        grid-column: span 1;
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

    &--code dd {
      font-family: var(--s-font-family-mono, monospace);
      font-size: var(--s-font-size-mini);
      line-height: 1.45;
    }

    a {
      color: var(--s-color-theme-accent);
    }
  }
}
</style>
