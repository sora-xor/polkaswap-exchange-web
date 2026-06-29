<template>
  <section
    class="market-outcome-chart"
    :class="{ 'market-outcome-chart--loading': loading }"
    data-testid="market-history-chart"
  >
    <div class="market-outcome-chart__summary">
      <div class="market-outcome-chart__legend">
        <span class="market-outcome-chart__chip market-outcome-chart__chip--yes">
          <i />
          {{ t('polkamarkt.outcomes.yes') }} {{ formatPercent(currentYes) }}
        </span>
        <span class="market-outcome-chart__chip market-outcome-chart__chip--no">
          <i />
          {{ t('polkamarkt.outcomes.no') }} {{ formatPercent(currentNo) }}
        </span>
      </div>
    </div>

    <div class="market-outcome-chart__frame">
      <div class="market-outcome-chart__plot-layer">
        <svg
          role="img"
          :aria-label="`${t('polkamarkt.outcomes.yes')} / ${t('polkamarkt.outcomes.no')}`"
          :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
          class="market-outcome-chart__svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient :id="yesGradientId" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="var(--s-color-theme-accent-hover)" />
              <stop offset="100%" stop-color="var(--s-color-theme-accent)" />
            </linearGradient>
          </defs>
          <rect
            data-testid="market-history-plot"
            class="market-outcome-chart__plot"
            x="0"
            y="0"
            :width="CHART_WIDTH"
            :height="CHART_HEIGHT"
            rx="8"
          />
          <g v-for="value in gridValues" :key="value">
            <line
              class="market-outcome-chart__grid-line"
              :x1="CHART_PADDING"
              :x2="CHART_WIDTH - CHART_PADDING"
              :y1="pointY(value)"
              :y2="pointY(value)"
              :stroke-dasharray="value === 50 ? '8 8' : '3 7'"
            />
          </g>

          <g
            v-for="series in outcomeSeries"
            :key="series.outcome"
            :data-testid="`market-history-series-${series.outcome.toLowerCase()}`"
            :opacity="series.outcome === 'YES' ? 1 : 0.82"
          >
            <path
              v-if="series.path"
              :d="series.path"
              fill="none"
              :stroke="series.shadow"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="10"
            />
            <path
              v-if="series.path"
              class="market-outcome-chart__series-line"
              :data-testid="`market-history-line-${series.outcome.toLowerCase()}`"
              :d="series.path"
              fill="none"
              :stroke="series.stroke"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="4"
            />
          </g>

          <template v-for="series in outcomeSeries" :key="`${series.outcome}-points`">
            <circle
              v-for="(point, index) in sortedPoints"
              :key="`${series.outcome}-${point.id}`"
              :cx="pointX(index, sortedPoints.length)"
              :cy="pointY(series.values[index] ?? point.probability)"
              :r="index === sortedPoints.length - 1 ? 4.5 : 3"
              :fill="series.dot"
              :opacity="series.outcome === 'YES' ? 0.95 : 0.72"
            />
          </template>
        </svg>

        <span
          v-for="value in gridValues"
          :key="`grid-label-${value}`"
          :data-testid="`market-history-grid-label-${value}`"
          class="market-outcome-chart__grid-label"
          :style="gridLabelStyle(value)"
          aria-hidden="true"
        >
          {{ value }}%
        </span>
        <span
          v-for="series in outcomeSeries"
          :key="`${series.outcome}-label`"
          class="market-outcome-chart__series-label"
          :data-testid="`market-history-label-${series.outcome.toLowerCase()}`"
          :style="seriesLabelStyle(series.labelY)"
          aria-hidden="true"
        >
          {{ series.outcome }} {{ formatPercent(series.current) }}
        </span>
      </div>

      <div class="market-outcome-chart__axis">
        <span>{{ startLabel }}</span>
        <span>{{ endLabel }}</span>
      </div>

      <div class="market-outcome-chart__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import type { MarketHistoryPoint, PolkamarktMarket, TicketOutcome } from '../types';

const props = defineProps<{
  market?: PolkamarktMarket;
  points?: MarketHistoryPoint[];
  loading?: boolean;
}>();

const { t } = useTranslation();

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const CHART_PADDING = 24;
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING * 2;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING * 2;
const gridValues = [25, 50, 75] as const;
const yesGradientId = `polkamarkt-yes-line-${Math.random().toString(36).slice(2)}`;

const pointX = (index: number, count: number): number =>
  count <= 1 ? CHART_WIDTH - CHART_PADDING : CHART_PADDING + (index / (count - 1)) * PLOT_WIDTH;

const pointY = (probability: number): number =>
  CHART_PADDING + ((100 - Math.max(0, Math.min(100, probability))) / 100) * PLOT_HEIGHT;

/** Maps SVG user coordinates to percentage offsets for non-scaling HTML chart labels. */
const svgPercent = (coordinate: number, total: number): string => `${(coordinate / total) * 100}%`;

const gridLabelStyle = (value: (typeof gridValues)[number]): Record<string, string> => ({
  left: svgPercent(CHART_PADDING, CHART_WIDTH),
  top: svgPercent(pointY(value) - 6, CHART_HEIGHT),
});

const seriesLabelStyle = (labelY: number): Record<string, string> => ({
  right: svgPercent(CHART_PADDING, CHART_WIDTH),
  top: svgPercent(labelY, CHART_HEIGHT),
});

const toLinePath = (values: number[]): string => {
  if (!values.length) return '';
  if (values.length === 1) {
    const y = pointY(values[0] ?? 0);
    return `M ${CHART_PADDING} ${y} L ${CHART_WIDTH - CHART_PADDING} ${y}`;
  }

  return values
    .map((value, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${pointX(index, values.length).toFixed(2)} ${pointY(value).toFixed(2)}`;
    })
    .join(' ');
};

const clampLabelY = (y: number): number => Math.max(CHART_PADDING + 16, Math.min(CHART_HEIGHT - CHART_PADDING - 8, y));

const labelPositions = (yes?: number, no?: number): Record<TicketOutcome, number | undefined> => {
  const yesY = yes === undefined ? undefined : clampLabelY(pointY(yes) - 12);
  const noY = no === undefined ? undefined : clampLabelY(pointY(no) - 12);

  if (yesY === undefined || noY === undefined || Math.abs(yesY - noY) >= 18) {
    return { YES: yesY, NO: noY };
  }

  const midpoint = (yesY + noY) / 2;
  return {
    YES: clampLabelY(midpoint - 9),
    NO: clampLabelY(midpoint + 9),
  };
};

const formatPointDate = (point?: MarketHistoryPoint): string => {
  if (!point?.timestamp) return t('polkamarkt.notIndexed');
  const timestampMs = point.timestamp > 10_000_000_000 ? point.timestamp : point.timestamp * 1_000;
  return new Date(timestampMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const sortedPoints = computed(() => {
  return [...(props.points ?? [])]
    .filter((point) => Number.isFinite(point.probability))
    .sort((left, right) => {
      const timestampDiff = (left.timestamp ?? 0) - (right.timestamp ?? 0);
      if (timestampDiff !== 0) return timestampDiff;
      return left.id.localeCompare(right.id);
    });
});

const yesValues = computed(() => sortedPoints.value.map((point) => point.probability));
const noValues = computed(() => sortedPoints.value.map((point) => 100 - point.probability));
const currentYes = computed(() => yesValues.value.at(-1) ?? props.market?.probability);
const currentNo = computed(() => (currentYes.value === undefined ? undefined : 100 - currentYes.value));
const currentLabelY = computed(() => labelPositions(currentYes.value, currentNo.value));
const startLabel = computed(() => formatPointDate(sortedPoints.value[0]));
const endLabel = computed(() => formatPointDate(sortedPoints.value.at(-1)));

const outcomeSeries = computed(() => [
  {
    outcome: 'YES' as const,
    values: yesValues.value,
    path: toLinePath(yesValues.value),
    current: currentYes.value,
    labelY: currentLabelY.value.YES ?? CHART_PADDING,
    stroke: `url(#${yesGradientId})`,
    shadow: 'rgba(248, 8, 123, 0.16)',
    dot: 'var(--s-color-theme-accent)',
  },
  {
    outcome: 'NO' as const,
    values: noValues.value,
    path: toLinePath(noValues.value),
    current: currentNo.value,
    labelY: currentLabelY.value.NO ?? CHART_HEIGHT - CHART_PADDING,
    stroke: 'var(--s-color-base-content-primary)',
    shadow: 'var(--s-color-base-border-primary)',
    dot: 'var(--s-color-base-content-primary)',
  },
]);

const formatPercent = (value?: number): string => (Number.isFinite(value) ? `${Math.round(value ?? 0)}%` : '--');
</script>

<style lang="scss" scoped>
.market-outcome-chart {
  min-width: 0;
  margin-bottom: $inner-spacing-big;
  padding: $inner-spacing-medium;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-surface);

  &--loading {
    opacity: 0.72;
  }

  &__summary {
    display: flex;
    justify-content: flex-end;
  }

  &__legend {
    display: flex;
    gap: $inner-spacing-tiny;
    flex-wrap: wrap;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: $inner-spacing-tiny;
    min-height: 28px;
    padding: 0 $inner-spacing-mini;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 999px;
    color: var(--s-color-base-content-secondary);
    font-weight: 700;
    font-size: var(--s-font-size-mini);

    i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    &--yes {
      color: var(--s-color-theme-accent);
      border-color: var(--s-color-theme-accent);
      background: rgba(248, 8, 123, 0.08);
    }

    &--no {
      color: var(--s-color-base-content-primary);
    }
  }

  &__frame {
    margin-top: $inner-spacing-medium;
  }

  &__plot-layer {
    position: relative;
    min-width: 0;
  }

  &__svg {
    display: block;
    width: 100%;
    height: 220px;
  }

  &__plot {
    fill: var(--s-color-base-background);
  }

  &__grid-line {
    stroke: var(--s-color-base-border-secondary);
  }

  &__grid-label {
    position: absolute;
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
    pointer-events: none;
    text-shadow:
      0 0 4px var(--s-color-base-background),
      0 0 4px var(--s-color-base-background);
    transform: translateY(-50%);
    white-space: nowrap;
  }

  &__series-label {
    position: absolute;
    color: var(--s-color-base-content-primary);
    font-size: 13px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0;
    pointer-events: none;
    text-align: right;
    text-shadow:
      0 0 5px var(--s-color-base-background),
      0 0 5px var(--s-color-base-background);
    transform: translateY(-50%);
    white-space: nowrap;
  }

  &__axis {
    display: flex;
    justify-content: space-between;
    gap: $inner-spacing-mini;
    margin-top: $inner-spacing-tiny;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-mini);
    font-weight: 700;
    text-transform: uppercase;
  }

  &__actions {
    margin-top: $inner-spacing-small;
  }
}
</style>
