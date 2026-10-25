<template>
  <section
    class="market-probability-sparkline"
    :class="{ 'market-probability-sparkline--loading': loading }"
    data-testid="market-card-sparkline"
  >
    <div class="market-probability-sparkline__legend">
      <span class="market-probability-sparkline__chip market-probability-sparkline__chip--yes">
        {{ t('polkamarkt.outcomes.yes') }} {{ formatPercent(currentYes) }}
      </span>
      <span class="market-probability-sparkline__chip market-probability-sparkline__chip--no">
        {{ t('polkamarkt.outcomes.no') }} {{ formatPercent(currentNo) }}
      </span>
    </div>

    <div class="market-probability-sparkline__frame">
      <svg
        role="img"
        :aria-label="ariaLabel"
        :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
        preserveAspectRatio="none"
      >
        <line
          v-for="value in gridValues"
          :key="value"
          class="market-probability-sparkline__grid"
          :x1="CHART_PADDING"
          :x2="CHART_WIDTH - CHART_PADDING"
          :y1="pointY(value)"
          :y2="pointY(value)"
        />
        <path
          v-if="yesPath"
          data-testid="market-card-sparkline-line-yes"
          class="market-probability-sparkline__line market-probability-sparkline__line--yes"
          :d="yesPath"
          fill="none"
        />
        <path
          v-if="noPath"
          data-testid="market-card-sparkline-line-no"
          class="market-probability-sparkline__line market-probability-sparkline__line--no"
          :d="noPath"
          fill="none"
        />
        <circle
          v-if="lastYesPoint"
          class="market-probability-sparkline__dot market-probability-sparkline__dot--yes"
          :cx="lastYesPoint.x"
          :cy="lastYesPoint.y"
          r="3"
        />
        <circle
          v-if="lastNoPoint"
          class="market-probability-sparkline__dot market-probability-sparkline__dot--no"
          :cx="lastNoPoint.x"
          :cy="lastNoPoint.y"
          r="3"
        />
      </svg>
      <span v-if="loading" class="market-probability-sparkline__loading">
        {{ t('polkamarkt.sparkline.loading') }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import type { MarketHistoryPoint, PolkamarktMarket } from '../types';

const props = withDefaults(
  defineProps<{
    market?: PolkamarktMarket;
    points?: MarketHistoryPoint[];
    loading?: boolean;
  }>(),
  {
    market: undefined,
    points: () => [],
    loading: false,
  }
);

const { t } = useTranslation();

const CHART_WIDTH = 180;
const CHART_HEIGHT = 64;
const CHART_PADDING = 8;
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING * 2;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING * 2;
const gridValues = [25, 50, 75] as const;

type ChartPoint = {
  x: number;
  y: number;
};

const sortedPoints = computed(() => {
  return [...props.points]
    .filter((point) => Number.isFinite(point.probability))
    .sort((left, right) => {
      const timestampDiff = (left.timestamp ?? 0) - (right.timestamp ?? 0);
      if (timestampDiff !== 0) return timestampDiff;
      const blockDiff = (left.blockHeight ?? 0) - (right.blockHeight ?? 0);
      if (blockDiff !== 0) return blockDiff;
      return left.id.localeCompare(right.id);
    });
});

const yesValues = computed(() => sortedPoints.value.map((point) => point.probability));
const noValues = computed(() => sortedPoints.value.map((point) => 100 - point.probability));
const currentYes = computed(() => yesValues.value.at(-1) ?? props.market?.probability);
const currentNo = computed(() => (currentYes.value === undefined ? undefined : 100 - currentYes.value));
const yesPath = computed(() => linePath(yesValues.value));
const noPath = computed(() => linePath(noValues.value));
const lastYesPoint = computed(() => lastChartPoint(yesValues.value));
const lastNoPoint = computed(() => lastChartPoint(noValues.value));
const ariaLabel = computed(() =>
  t('polkamarkt.sparkline.ariaLabel', {
    no: formatPercent(currentNo.value),
    yes: formatPercent(currentYes.value),
  })
);

function pointX(index: number, count: number): number {
  return count <= 1 ? CHART_WIDTH - CHART_PADDING : CHART_PADDING + (index / (count - 1)) * PLOT_WIDTH;
}

function pointY(probability: number): number {
  const clamped = Math.max(0, Math.min(100, probability));
  return CHART_PADDING + ((100 - clamped) / 100) * PLOT_HEIGHT;
}

function linePath(values: number[]): string {
  if (!values.length) return '';
  if (values.length === 1) {
    const y = pointY(values[0] ?? 0);
    return `M ${CHART_PADDING} ${y.toFixed(2)} L ${CHART_WIDTH - CHART_PADDING} ${y.toFixed(2)}`;
  }

  return values
    .map((value, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${pointX(index, values.length).toFixed(2)} ${pointY(value).toFixed(2)}`;
    })
    .join(' ');
}

function lastChartPoint(values: number[]): ChartPoint | undefined {
  if (!values.length) return undefined;
  const index = values.length - 1;
  return {
    x: pointX(index, values.length),
    y: pointY(values[index] ?? 0),
  };
}

function formatPercent(value?: number): string {
  return Number.isFinite(value) ? `${Math.round(value ?? 0)}%` : '--';
}
</script>

<style lang="scss" scoped>
.market-probability-sparkline {
  display: grid;
  gap: $inner-spacing-tiny;
  min-width: 0;

  &--loading {
    opacity: 0.72;
  }

  &__legend {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-tiny;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  &__chip {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-mini);
    font-weight: 700;
    line-height: var(--s-line-height-mini);

    &--yes {
      color: var(--s-color-theme-accent);
    }

    &--no {
      color: var(--s-color-base-content-primary);
    }
  }

  &__frame {
    position: relative;
    min-width: 0;
    height: 72px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-base-background);
    overflow: hidden;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__grid {
    stroke: var(--s-color-base-border-secondary);
    stroke-dasharray: 4 6;
    stroke-width: 1;
  }

  &__line {
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 3;

    &--yes {
      stroke: var(--s-color-theme-accent);
    }

    &--no {
      stroke: var(--s-color-base-content-primary);
      opacity: 0.82;
    }
  }

  &__dot {
    stroke: var(--s-color-utility-surface);
    stroke-width: 2;

    &--yes {
      fill: var(--s-color-theme-accent);
    }

    &--no {
      fill: var(--s-color-base-content-primary);
    }
  }

  &__loading {
    position: absolute;
    right: $inner-spacing-tiny;
    bottom: $inner-spacing-tiny;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-mini);
    line-height: var(--s-line-height-mini);
  }
}
</style>
