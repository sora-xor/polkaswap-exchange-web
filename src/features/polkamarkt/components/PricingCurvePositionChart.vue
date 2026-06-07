<template>
  <section
    class="pricing-curve"
    :class="{ 'pricing-curve--compact': compact }"
    data-testid="pricing-curve-position-chart"
  >
    <header class="pricing-curve__header">
      <div>
        <span class="pricing-curve__kicker">{{ t('polkamarkt.curve.kicker') }}</span>
        <h3>{{ t('polkamarkt.curve.title') }}</h3>
        <p>{{ t('polkamarkt.curve.subtitle') }}</p>
      </div>
      <span class="pricing-curve__badge">{{ t('polkamarkt.curve.stateBadge') }}</span>
    </header>

    <div class="pricing-curve__plot">
      <svg
        role="img"
        :aria-label="t('polkamarkt.curve.ariaLabel')"
        :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
        class="pricing-curve__svg"
      >
        <defs>
          <linearGradient :id="yesGradientId" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="var(--curve-yes-start)" stop-opacity="0.72" />
            <stop offset="58%" stop-color="var(--curve-yes)" stop-opacity="1" />
            <stop offset="100%" stop-color="var(--curve-yes-end)" stop-opacity="0.86" />
          </linearGradient>
        </defs>

        <rect class="pricing-curve__plot-bg" x="0" y="0" :width="CHART_WIDTH" :height="CHART_HEIGHT" rx="8" />

        <g v-for="quote in quoteGridValues" :key="`quote-${quote}`">
          <line
            class="pricing-curve__grid-line"
            :x1="CHART_PADDING_X"
            :x2="CHART_WIDTH - CHART_PADDING_X"
            :y1="quoteY(quote)"
            :y2="quoteY(quote)"
          />
          <text class="pricing-curve__axis-text" :x="CHART_PADDING_X - 12" :y="quoteY(quote) + 4" text-anchor="end">
            {{ quoteGridLabel(quote) }}
          </text>
        </g>

        <line
          class="pricing-curve__axis-line"
          :x1="CHART_PADDING_X"
          :x2="CHART_PADDING_X"
          :y1="CHART_PADDING_TOP"
          :y2="plotBottomY"
        />
        <line
          class="pricing-curve__axis-line"
          :x1="CHART_PADDING_X"
          :x2="CHART_WIDTH - CHART_PADDING_X"
          :y1="plotBottomY"
          :y2="plotBottomY"
        />

        <text
          class="pricing-curve__axis-title"
          :x="Y_AXIS_LABEL_X"
          :y="yAxisLabelY"
          text-anchor="middle"
          :transform="`rotate(-90 ${Y_AXIS_LABEL_X} ${yAxisLabelY})`"
        >
          {{ t('polkamarkt.curve.yAxis') }}
        </text>

        <g v-for="percent in demandGridValues" :key="`demand-${percent}`">
          <line
            class="pricing-curve__grid-line pricing-curve__grid-line--vertical"
            :x1="demandX(percent)"
            :x2="demandX(percent)"
            :y1="CHART_PADDING_TOP"
            :y2="plotBottomY"
          />
          <text class="pricing-curve__axis-text" :x="demandX(percent)" :y="X_TICK_LABEL_Y" text-anchor="middle">
            {{ percent }}%
          </text>
        </g>

        <path class="pricing-curve__line pricing-curve__line--no" :d="noCurvePath" fill="none" />
        <path
          class="pricing-curve__line pricing-curve__line--yes"
          :d="yesCurvePath"
          :stroke="`url(#${yesGradientId})`"
          fill="none"
        />

        <line
          class="pricing-curve__state-line"
          :x1="currentX"
          :x2="currentX"
          :y1="CHART_PADDING_TOP"
          :y2="plotBottomY"
        />
        <circle class="pricing-curve__state-dot pricing-curve__state-dot--no" :cx="currentX" :cy="currentNoY" r="6" />
        <circle class="pricing-curve__state-dot pricing-curve__state-dot--yes" :cx="currentX" :cy="currentYesY" r="7" />
        <text class="pricing-curve__state-label" :x="currentStateLabelX" :y="currentStateLabelY">
          {{ t('polkamarkt.curve.currentState') }}
        </text>

        <text class="pricing-curve__axis-title" :x="CHART_WIDTH / 2" :y="X_AXIS_LABEL_Y" text-anchor="middle">
          {{ t('polkamarkt.curve.xAxis') }}
        </text>
        <text class="pricing-curve__axis-text" :x="CHART_PADDING_X" :y="DEMAND_CUE_LABEL_Y">
          {{ t('polkamarkt.curve.moreNoDemand') }}
        </text>
        <text class="pricing-curve__axis-text" :x="CHART_WIDTH - CHART_PADDING_X" :y="DEMAND_CUE_LABEL_Y" text-anchor="end">
          {{ t('polkamarkt.curve.moreYesDemand') }}
        </text>
      </svg>
    </div>

    <dl class="pricing-curve__metrics">
      <div v-for="metric in curveMetrics" :key="metric.label" class="pricing-curve__metric" :class="metric.className">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>

    <p class="pricing-curve__summary">{{ currentQuoteSummary }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { POLKAMARKT_COLLATERAL_ASSET } from '../consts';
import { getPricingCurvePosition, pricingCurvePoints } from '../lib/pricingCurve';

import type { PolkamarktMarket } from '../types';

const props = withDefaults(
  defineProps<{
    market?: PolkamarktMarket;
    compact?: boolean;
  }>(),
  {
    compact: false,
  }
);

const { t } = useTranslation();
const collateralSymbol = POLKAMARKT_COLLATERAL_ASSET.symbol;

const CHART_WIDTH = 640;
const CHART_HEIGHT = 304;
const CHART_PADDING_X = 58;
const CHART_PADDING_TOP = 28;
const CHART_PADDING_BOTTOM = 70;
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING_X * 2;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
const Y_AXIS_LABEL_X = 16;
const X_TICK_LABEL_Y = CHART_PADDING_TOP + PLOT_HEIGHT + 20;
const X_AXIS_LABEL_Y = CHART_PADDING_TOP + PLOT_HEIGHT + 43;
const DEMAND_CUE_LABEL_Y = CHART_HEIGHT - 8;
const quoteGridValues = [0, 0.25, 0.5, 0.75, 1] as const;
const demandGridValues = [0, 25, 50, 75, 100] as const;
const yesGradientId = `polkamarkt-curve-yes-${Math.random().toString(36).slice(2)}`;
const curvePoints = pricingCurvePoints();

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const plotBottomY = CHART_PADDING_TOP + PLOT_HEIGHT;
const yAxisLabelY = CHART_PADDING_TOP + PLOT_HEIGHT / 2;

const demandX = (percent: number): number => CHART_PADDING_X + (clamp(percent, 0, 100) / 100) * PLOT_WIDTH;
const quoteY = (quote: number): number => CHART_PADDING_TOP + (1 - clamp(quote, 0, 1)) * PLOT_HEIGHT;
const linePath = (points: Array<{ percent: number; quote: number }>): string =>
  points
    .map(({ percent, quote }, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${demandX(percent).toFixed(2)} ${quoteY(quote).toFixed(2)}`;
    })
    .join(' ');

const yesCurvePath = linePath(curvePoints.map(({ percent, yesQuote }) => ({ percent, quote: yesQuote })));
const noCurvePath = linePath(curvePoints.map(({ percent, noQuote }) => ({ percent, quote: noQuote })));
const position = computed(() => getPricingCurvePosition(props.market));
const hasPosition = computed(
  () =>
    position.value.yesDemand !== undefined &&
    position.value.yesQuote !== undefined &&
    position.value.noQuote !== undefined
);
const currentX = computed(() => (hasPosition.value ? demandX(position.value.yesDemand ?? 50) : CHART_WIDTH / 2));
const currentYesY = computed(() => (hasPosition.value ? quoteY(position.value.yesQuote ?? 0.5) : quoteY(0.5)));
const currentNoY = computed(() => (hasPosition.value ? quoteY(position.value.noQuote ?? 0.5) : quoteY(0.5)));
const currentStateLabelX = computed(() =>
  clamp(currentX.value + 10, CHART_PADDING_X + 10, CHART_WIDTH - CHART_PADDING_X - 100)
);
const currentStateLabelY = computed(() =>
  clamp(Math.min(currentYesY.value, currentNoY.value) - 12, 16, CHART_HEIGHT - 58)
);

const formatPercent = (value?: number): string =>
  value === undefined ? t('polkamarkt.notIndexed') : `${value.toFixed(1).replace(/\.0$/, '')}%`;

const formatQuote = (value?: number): string => {
  if (value === undefined) return t('polkamarkt.notIndexed');
  if (value > 0 && value < 0.0001) return `<0.0001 ${collateralSymbol}`;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)} ${collateralSymbol}`;
};

const quoteGridLabel = (quote: number): string => {
  if (quote === 1) return `1 ${collateralSymbol}`;
  if (quote === 0) return `0 ${collateralSymbol}`;
  return quote.toFixed(2);
};

const curveMetrics = computed(() => [
  {
    label: t('polkamarkt.curve.yesDemand'),
    value: formatPercent(position.value.yesDemand),
    className: '',
  },
  {
    label: t('polkamarkt.curve.yesQuote'),
    value: formatQuote(position.value.yesQuote),
    className: 'pricing-curve__metric--yes',
  },
  {
    label: t('polkamarkt.curve.noQuote'),
    value: formatQuote(position.value.noQuote),
    className: 'pricing-curve__metric--no',
  },
  {
    label: t('polkamarkt.curve.collateral'),
    value: formatQuote(position.value.collateral),
    className: 'pricing-curve__metric--collateral',
  },
]);

const currentQuoteSummary = computed(() =>
  hasPosition.value
    ? t('polkamarkt.curve.currentQuoteSummary', {
        yes: formatQuote(position.value.yesQuote),
        no: formatQuote(position.value.noQuote),
      })
    : t('polkamarkt.curve.unavailable')
);
</script>

<style lang="scss" scoped>
.pricing-curve {
  --curve-yes: var(--s-color-theme-accent);
  --curve-yes-start: var(--s-color-theme-accent-hover);
  --curve-yes-end: var(--s-color-theme-accent);
  --curve-no: var(--s-color-theme-secondary);

  display: grid;
  gap: $inner-spacing-medium;
  min-width: 0;
  margin-bottom: $inner-spacing-big;
  padding: $inner-spacing-medium;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-surface);

  &--compact {
    gap: $inner-spacing-small;
    margin-bottom: 0;
    padding: $inner-spacing-small;

    .pricing-curve__header {
      gap: $inner-spacing-mini;
    }

    .pricing-curve__header p,
    .pricing-curve__badge,
    .pricing-curve__summary {
      display: none;
    }

    .pricing-curve__metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $inner-spacing-medium;
    min-width: 0;

    h3 {
      margin: $inner-spacing-tiny 0 0;
      font-size: var(--s-heading5-font-size);
      line-height: var(--s-line-height-medium);
    }

    p {
      margin: $inner-spacing-tiny 0 0;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-small);
    }
  }

  &__kicker,
  &__badge,
  &__metric dt {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-mini);
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  &__badge {
    flex: 0 0 auto;
    min-height: 24px;
    padding: 4px $inner-spacing-mini;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 999px;
  }

  &__plot {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
  }

  &__svg {
    display: block;
    width: 100%;
    height: auto;
  }

  &__plot-bg {
    fill: var(--s-color-base-background);
  }

  &__grid-line,
  &__axis-line {
    stroke: var(--s-color-base-border-secondary);
    stroke-width: 1;
  }

  &__grid-line {
    opacity: 0.56;

    &--vertical {
      opacity: 0.32;
    }
  }

  &__axis-line {
    opacity: 0.9;
    stroke-width: 1.5;
  }

  &__axis-text,
  &__axis-title {
    fill: var(--s-color-base-content-secondary);
    font-size: 12px;
    letter-spacing: 0;
  }

  &__axis-title {
    font-weight: 700;
  }

  &__line {
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 4;

    &--no {
      stroke: var(--curve-no);
      opacity: 0.88;
    }
  }

  &__state-line {
    stroke: var(--s-color-base-content-secondary);
    stroke-dasharray: 6 8;
    stroke-width: 2;
    opacity: 0.82;
  }

  &__state-dot {
    stroke: var(--s-color-base-background);
    stroke-width: 3;

    &--yes {
      fill: var(--curve-yes);
    }

    &--no {
      fill: var(--curve-no);
    }
  }

  &__state-label {
    fill: var(--s-color-base-content-primary);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
    paint-order: stroke;
    stroke: var(--s-color-base-background);
    stroke-width: 4;
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 112px), 1fr)'});
    gap: $inner-spacing-small $inner-spacing-medium;
    margin: 0;
    padding-top: $inner-spacing-small;
    border-top: 1px solid var(--s-color-base-border-secondary);
  }

  &__metric {
    min-width: 0;

    dd {
      margin: $inner-spacing-tiny 0 0;
      color: var(--s-color-base-content-primary);
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    &--yes dd {
      color: var(--curve-yes);
    }

    &--no dd {
      color: var(--curve-no);
    }

    &--collateral dd {
      color: var(--s-color-status-info);
    }
  }

  &__summary {
    margin: 0;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-small);
  }
}
</style>
