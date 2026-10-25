<template>
  <section class="experiment-equity" data-testid="experiment-equity">
    <header class="equity-heading">
      <div>
        <h3>{{ t('bots.lab.compareEquity') }}</h3>
        <p>{{ t('bots.uxResults.equityDescription') }}</p>
      </div>
      <span class="equity-axis-unit">{{ t('bots.lab.returnUnit') }}</span>
    </header>
    <div v-if="!hasPoints" class="equity-empty">{{ t('bots.lab.compareEmpty') }}</div>
    <template v-else>
      <div class="equity-plot">
        <div class="equity-y-labels" aria-hidden="true">
          <span>{{ formatExperimentPercent(plot.maximum, true) }}%</span
          ><span>{{ formatExperimentPercent(plot.minimum, true) }}%</span>
        </div>
        <svg
          class="equity-canvas"
          viewBox="0 0 800 220"
          preserveAspectRatio="none"
          role="img"
          :aria-label="t('bots.lab.compareEquity')"
          @pointermove="inspectPointer"
          @pointerleave="inspection = 1000"
        >
          <path v-for="row in [10, 60, 110, 160, 210]" :key="row" :d="`M10,${row} H790`" class="equity-grid" />
          <path
            v-for="column in [10, 205, 400, 595, 790]"
            :key="column"
            :d="`M${column},10 V210`"
            class="equity-grid equity-grid-vertical"
          />
          <path :d="`M10,${plot.zeroY} H790`" class="equity-zero" />
          <path
            v-for="(series, index) in plot.series"
            :key="`glow-${series.id}`"
            :d="series.path"
            class="equity-glow"
            :style="{ stroke: color(index), opacity: focused(series.id) ? 0.15 : 0.025 }"
            aria-hidden="true"
          />
          <path
            v-for="(series, index) in plot.series"
            :key="series.id"
            :d="series.path"
            class="equity-series"
            pathLength="1"
            :style="{ stroke: color(index), opacity: focused(series.id) ? 1 : 0.3 }"
            :data-series="series.id"
          />
          <path :d="`M${cursorX},10 V210`" class="equity-inspection" />
          <circle
            v-for="(point, index) in inspectedPoints"
            :key="plot.series[index].id"
            :cx="point?.x"
            :cy="point?.y"
            :r="point ? 3.5 : 0"
            :fill="color(index)"
            class="equity-dot"
          />
        </svg>
      </div>
      <div class="equity-timeline">
        <time>{{ dateLabel(plot.start) }}</time
        ><time>{{ dateLabel(plot.end) }}</time>
      </div>
      <p class="equity-period-note">{{ t('bots.uxResults.equityPeriodNote') }}</p>
      <div class="equity-inspector">
        <label :for="inputId">{{ t('bots.lab.inspectTimeline') }}</label
        ><input
          :id="inputId"
          v-model.number="inspection"
          type="range"
          min="0"
          max="1000"
          :aria-valuetext="dateLabel(cursorTimestamp, true)"
        /><time>{{ dateLabel(cursorTimestamp, true) }}</time>
      </div>
      <div class="equity-legend" role="group" :aria-label="t('bots.lab.compareEquity')">
        <button
          v-for="(entry, index) in results"
          :key="entry.id"
          class="equity-legend-item"
          :aria-pressed="selectedId === entry.id"
          :style="{ '--series-color': color(index) }"
          @click="emit('select', entry.id)"
        >
          <i aria-hidden="true"></i><span>{{ entry.name }}</span
          ><strong
            >{{ formatExperimentPercent(inspectedPoints[index]?.returnPercent, true)
            }}<small v-if="inspectedPoints[index]">%</small></strong
          >
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { formatExperimentPercent, plotExperimentEquity } from '../experiment-visuals';
import type { ResearchResult } from '../research';

/** Shared timestamp/percentage axes compare historical strategies across input-token denominations. */
const props = defineProps<{
  results: Array<{ id: string; name: string; result: ResearchResult }>;
  selectedId?: string;
}>();
const emit = defineEmits<{ select: [id: string] }>();
const { t } = useTranslation();
const inputId = `equity-inspect-${useId()}`;
const inspection = ref(1000);
const plot = computed(() =>
  plotExperimentEquity(props.results.map(({ id, result }) => ({ id, equity: result.result.equity })))
);
const hasPoints = computed(() => plot.value.series.some((series) => series.points.length));
const cursorX = computed(() => 10 + (inspection.value / 1000) * 780);
const cursorTimestamp = computed(() =>
  plot.value.start === null || plot.value.end === null
    ? null
    : plot.value.start + (inspection.value / 1000) * (plot.value.end - plot.value.start)
);
const inspectedPoints = computed(() =>
  plot.value.series.map((series) => {
    const timestamp = cursorTimestamp.value;
    if (
      timestamp === null ||
      !series.points.length ||
      timestamp < series.points[0].timestamp ||
      timestamp > series.points.at(-1)!.timestamp
    )
      return undefined;
    return series.points.findLast((point) => point.timestamp <= timestamp);
  })
);

/** Stable data colors identify the same curve in the chart and its legend. */
function color(index: number): string {
  return [
    'var(--lab-accent, var(--s-color-action-text, #ab0555))',
    'var(--lab-cyan, var(--s-color-status-success-text, #166e53))',
    'var(--s-color-base-content-primary, #2d2534)',
    'var(--s-color-status-warning-text, #805700)',
    'var(--s-color-base-content-secondary, #70646c)',
    'var(--s-color-status-error-text, #ab0555)',
  ][index % 6];
}
/** Focus is optional: without a selected run every comparison gets equal emphasis. */
function focused(id: string): boolean {
  return !props.selectedId || props.selectedId === id;
}
/** Present UTC explicitly so historical candle dates are unambiguous across timezones. */
function dateLabel(timestamp: number | null, time = false): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return '—';
  const iso = new Date(timestamp).toISOString();
  return time ? `${iso.slice(5, 16).replace('T', ' ')} UTC` : iso.slice(0, 10);
}
/** Pointer inspection maps only into plot coordinates; monetary values remain exact strings. */
function inspectPointer(event: PointerEvent): void {
  const bounds = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
  if (!bounds.width) return;
  inspection.value = Math.round(
    Math.max(0, Math.min(1000, ((((event.clientX - bounds.left) / bounds.width) * 800 - 10) / 780) * 1000))
  );
}
</script>

<style scoped lang="scss">
.experiment-equity {
  min-width: 0;
  color: var(--lab-text, var(--s-color-base-content-primary, #2d2534));
  padding: 22px 0 0;
}
.equity-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  p {
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
    font-size: 13px;
    line-height: 1.6;
    margin: 7px 0 0;
  }
}
.equity-axis-unit {
  flex-shrink: 0;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 12px;
  padding-top: 4px;
}
.equity-empty {
  display: grid;
  place-items: center;
  min-height: 190px;
  border-block: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 12px;
  padding: 20px;
  text-align: center;
}
.equity-plot {
  display: flex;
  align-items: stretch;
  gap: 6px;
  border-radius: 16px;
  padding: 12px 8px 12px 4px;
  background: var(--s-color-base-background);
  box-shadow: none;
  border: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
}
.equity-y-labels {
  width: 60px;
  flex: 0 0 60px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font:
    11px/1.2 'SFMono-Regular',
    Consolas,
    monospace;
  text-align: right;
  padding: 6px 2px 6px 0;
  overflow-wrap: anywhere;
}
.equity-canvas {
  flex: 1;
  width: calc(100% - 66px);
  min-width: 0;
  height: 220px;
  display: block;
  cursor: crosshair;
  overflow: visible;
}
.equity-grid {
  stroke: var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  stroke-opacity: 0.65;
  fill: none;
  vector-effect: non-scaling-stroke;
}
.equity-grid-vertical {
  stroke-dasharray: 1 6;
}
.equity-zero {
  stroke: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  stroke-opacity: 0.4;
  fill: none;
  stroke-dasharray: 3 4;
}
.equity-series {
  fill: none;
  stroke-width: 1.8px;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: opacity 200ms;
  animation: reveal-curve 700ms ease-out;
}
.equity-glow {
  fill: none;
  stroke-width: 7px;
  vector-effect: non-scaling-stroke;
  filter: blur(3px);
}
.equity-inspection {
  fill: none;
  stroke: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  stroke-opacity: 0.45;
  stroke-dasharray: 2 4;
}
.equity-dot {
  stroke: var(--lab-panel, var(--s-color-utility-surface, #f6f2f5));
  stroke-width: 1.5;
}
.equity-timeline {
  display: flex;
  justify-content: space-between;
  margin: 8px 10px 0 76px;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font:
    11px 'SFMono-Regular',
    Consolas,
    monospace;
}
.equity-period-note {
  margin: 12px 0 0;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 12px;
  line-height: 1.6;
}
.equity-inspector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0 14px;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 12px;
  input {
    flex: 1;
    min-width: 30px;
    height: 3px;
    accent-color: var(--lab-accent, var(--s-color-action-text, #ab0555));
    cursor: pointer;
  }
  time {
    font:
      11px 'SFMono-Regular',
      Consolas,
      monospace;
    white-space: nowrap;
  }
}
.equity-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 10px 0;
  border-top: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
}
.equity-legend-item {
  min-width: 200px;
  flex: 1;
  display: flex;
  gap: 9px;
  align-items: center;
  padding: 9px 8px;
  border-radius: 16px;
  border: 1px solid transparent;
  background: none;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  cursor: pointer;
  font: inherit;
  text-align: start;
  font-size: 13px;
  i {
    display: inline-block;
    width: 15px;
    height: 2px;
    background: var(--series-color);
    box-shadow: 0 0 8px var(--series-color);
    flex-shrink: 0;
  }
  span {
    flex: 1;
    overflow-wrap: anywhere;
  }
  strong {
    color: var(--series-color);
    font:
      13px 'SFMono-Regular',
      Consolas,
      monospace;
    white-space: nowrap;
    small {
      font-size: 11px;
    }
  }
  &:hover,
  &[aria-pressed='true'] {
    border-color: var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
    color: var(--lab-text, var(--s-color-base-content-primary, #2d2534));
    background: var(--s-color-base-background);
  }
  &:focus-visible {
    outline: 2px solid var(--lab-cyan, var(--s-color-status-success-text, #166e53));
  }
}
@keyframes reveal-curve {
  from {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }
  to {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
  }
}
@media (max-width: 600px) {
  .equity-heading {
    flex-wrap: wrap;
    gap: 8px;
  }
  .equity-axis-unit {
    display: none;
  }
  .equity-y-labels {
    width: 46px;
    flex-basis: 46px;
  }
  .equity-timeline {
    margin-left: 60px;
  }
  .equity-canvas {
    height: 180px;
  }
  .equity-inspector {
    flex-wrap: wrap;
    label {
      width: 100%;
    }
  }
  .equity-legend-item {
    min-width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
