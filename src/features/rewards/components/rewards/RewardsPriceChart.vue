<template>
  <figure class="rw-chart" :class="{ 'is-loading': loading }" dir="ltr" :aria-busy="loading">
    <div v-if="!tableView && points.length" class="rw-chart__frame">
      <div class="rw-chart__axis" aria-hidden="true" :style="{ height: `${HEIGHT}px` }">
        <span v-for="tick in geometry.ticks" :key="tick.value" class="rw-chart__tick" :style="{ top: `${tick.y}px` }">
          {{ formatPrice(new FPNumber(tick.value), symbol, geometry.decimals) }}
        </span>
      </div>

      <div
        ref="plot"
        class="rw-chart__plot"
        :style="{ height: `${HEIGHT}px` }"
        tabindex="0"
        role="img"
        :aria-label="label"
        @pointermove="handlePointerMove"
        @pointerleave="clearActive"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @blur="clearActive"
      >
        <svg
          class="rw-chart__svg"
          :viewBox="`0 0 ${geometry.width} ${geometry.height}`"
          :width="geometry.width"
          :height="geometry.height"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient :id="fillId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" class="rw-chart__stop" stop-opacity="0.2" />
              <stop offset="100%" class="rw-chart__stop" stop-opacity="0" />
            </linearGradient>
          </defs>
          <line
            v-for="tick in geometry.ticks"
            :key="tick.value"
            class="rw-chart__grid"
            :x1="geometry.padding.left"
            :x2="geometry.width - geometry.padding.right"
            :y1="tick.y"
            :y2="tick.y"
          />
          <path :key="`area-${drawKey}`" class="rw-chart__area" :d="geometry.area" :fill="`url(#${fillId})`" />
          <path :key="`line-${drawKey}`" class="rw-chart__line" :d="geometry.line" pathLength="1" />
          <line
            v-if="activePoint"
            class="rw-chart__cross"
            :x1="activePoint.x"
            :x2="activePoint.x"
            :y1="geometry.padding.top"
            :y2="geometry.baseline"
          />
        </svg>
        <span
          v-if="endPoint"
          :key="`end-${drawKey}`"
          class="rw-chart__dot rw-chart__dot--end"
          :style="dotStyle(endPoint)"
        ></span>
        <span v-if="activePoint" class="rw-chart__dot" :style="dotStyle(activePoint)"></span>
        <div v-if="activePoint" class="rw-chart__tip" :class="tipPlacement" :style="dotStyle(activePoint)">
          <span class="rw-chart__tip-value">
            <i class="rw-chart__key" aria-hidden="true"></i>{{ formatPrice(new FPNumber(activePoint.price), symbol) }}
          </span>
          <span class="rw-chart__tip-date">{{ formatDate(activePoint.time, true) }}</span>
        </div>
      </div>

      <div v-if="firstPoint && endPoint" class="rw-chart__x" aria-hidden="true">
        <span>{{ formatDate(firstPoint.time) }}</span>
        <span>{{ formatDate(endPoint.time) }}</span>
      </div>
      <span class="rw-sr-only" aria-live="polite">{{ liveText }}</span>
    </div>

    <div v-else-if="tableView && points.length" class="rw-chart__table" tabindex="0" role="region" :aria-label="label">
      <table class="rw-table">
        <caption class="rw-sr-only">
          {{
            label
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ dateHeading }}</th>
            <th scope="col">{{ priceHeading }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="point in tableRows" :key="point.time">
            <th scope="row">{{ formatDate(point.time, true) }}</th>
            <td>{{ formatPrice(new FPNumber(point.price), symbol) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';

import {
  buildChartGeometry,
  formatPrice,
  nearestPointIndex,
  type ChartPadding,
  type ChartPoint,
  type PricePoint,
} from '@/features/rewards/utils/market';

/**
 * Price line with an area wash, hairline gridlines, a crosshair and a tooltip.
 *
 * The line is 2px, the end marker 10px with a 2px ring in the surface color, and the area is a ~20% wash that fades out.
 * The crosshair snaps to the nearest day and shows the same readout for pointer and keyboard (arrow keys, Home, End).
 * `tableView` swaps the plot for a table with the same numbers.
 *
 * Prices are in the display currency already; they are plain numbers here because they only position a line.
 */
defineOptions({
  name: 'RewardsPriceChart',
});

const props = withDefaults(
  defineProps<{
    points?: PricePoint[];
    /** Currency symbol shown before prices. */
    symbol?: string;
    /** Accessible name of the chart, for example "PSWAP price, last 30 days". */
    label?: string;
    /** Locale for dates; the browser's locale when omitted. */
    locale?: string;
    /** Dim the chart while it refreshes; the old line stays on screen. */
    loading?: boolean;
    tableView?: boolean;
    dateHeading?: string;
    priceHeading?: string;
  }>(),
  {
    points: () => [],
    symbol: '',
    label: '',
    locale: undefined,
    loading: false,
    tableView: false,
    dateHeading: '',
    priceHeading: '',
  }
);

const HEIGHT = 128;
const PADDING: ChartPadding = { top: 12, right: 8, bottom: 8, left: 4 };
const DEFAULT_WIDTH = 280;

const fillId = `rw-fill-${useId()}`;
const plot = ref<HTMLElement | null>(null);
const width = ref(DEFAULT_WIDTH);
const activeIndex = ref<number | null>(null);
let observer: ResizeObserver | undefined;

// The indexer stamps a daily candle with the last block of its UTC day (about 23:59 UTC). East of Greenwich that is
// already the next day in local time, so dates are read in UTC to name the day the candle covers.
const dayFormat = computed(
  () => new Intl.DateTimeFormat(props.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
);
const fullFormat = computed(() => new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium', timeZone: 'UTC' }));

const geometry = computed(() => buildChartGeometry(props.points, width.value, HEIGHT, PADDING));

/** Identity of the series on screen. The line draws itself again for a new series, not for a resize or a new rate. */
const drawKey = computed(() => {
  const points = props.points;

  return `${props.label}|${points.length}|${points[0]?.time ?? ''}|${points[points.length - 1]?.time ?? ''}`;
});
const firstPoint = computed(() => geometry.value.points[0] ?? null);
const endPoint = computed(() => geometry.value.points[geometry.value.points.length - 1] ?? null);
const activePoint = computed<ChartPoint | null>(() =>
  activeIndex.value === null ? null : (geometry.value.points[activeIndex.value] ?? null)
);
const tableRows = computed(() => [...props.points].reverse());

const tipPlacement = computed(() => {
  const point = activePoint.value;

  if (!point) return '';

  const horizontal = point.x < 72 ? 'is-start' : point.x > width.value - 72 ? 'is-end' : '';
  const vertical = point.y < 58 ? 'is-below' : '';

  return [horizontal, vertical].filter(Boolean).join(' ');
});

const liveText = computed(() =>
  activePoint.value
    ? `${formatDate(activePoint.value.time, true)}: ${formatPrice(new FPNumber(activePoint.value.price), props.symbol)}`
    : ''
);

const formatDate = (time: number, full = false): string => (full ? fullFormat : dayFormat).value.format(new Date(time));

const dotStyle = (point: ChartPoint) => ({ left: `${point.x}px`, top: `${point.y}px` });

const clearActive = (): void => {
  activeIndex.value = null;
};

const handlePointerMove = (event: PointerEvent): void => {
  const element = plot.value;

  if (!element) return;

  const index = nearestPointIndex(geometry.value.points, event.clientX - element.getBoundingClientRect().left);

  activeIndex.value = index >= 0 ? index : null;
};

const handleFocus = (): void => {
  if (activeIndex.value === null && props.points.length) activeIndex.value = props.points.length - 1;
};

const handleKeydown = (event: KeyboardEvent): void => {
  const last = props.points.length - 1;

  if (last < 0) return;

  const current = activeIndex.value ?? last;
  let next = current;

  switch (event.key) {
    case 'ArrowLeft':
      next = Math.max(0, current - 1);
      break;
    case 'ArrowRight':
      next = Math.min(last, current + 1);
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = last;
      break;
    case 'Escape':
      clearActive();
      return;
    default:
      return;
  }

  event.preventDefault();
  activeIndex.value = next;
};

const measure = (): void => {
  const element = plot.value;

  if (element && element.clientWidth > 0) width.value = Math.round(element.clientWidth);
};

watch(
  () => props.points,
  () => clearActive()
);

onMounted(() => {
  if (typeof ResizeObserver === 'function') observer = new ResizeObserver(measure);

  if (plot.value) {
    measure();
    observer?.observe(plot.value);
  }
});

// The plot is created and removed with the chart/table switch and with data arriving, so follow the element itself.
watch(
  plot,
  (element, previous) => {
    if (previous) observer?.unobserve(previous);
    if (element) {
      measure();
      observer?.observe(element);
    }
  },
  { flush: 'post' }
);

onBeforeUnmount(() => observer?.disconnect());
</script>

<style lang="scss">
.rw-chart {
  position: relative;
  margin: 0;
  transition: opacity 0.25s ease;

  // A refresh keeps the previous render on screen, only dimmed.
  &.is-loading {
    opacity: 0.55;
  }

  &__frame {
    display: grid;
    grid-template-columns: #{'auto minmax(0, 1fr)'};
    column-gap: 6px;
    row-gap: 6px;
  }

  &__axis {
    position: relative;
    min-width: 3.2em;
  }

  &__tick {
    position: absolute;
    inset-inline-end: 0;
    transform: translateY(-50%);
    color: var(--rw-faint, #796971);
    font-size: 10.5px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__plot {
    position: relative;
    border-radius: 8px;
    outline: none;
    touch-action: pan-y;
    cursor: crosshair;

    &:focus-visible {
      outline: 2px solid var(--s-color-focus-ring, #ab0555);
      outline-offset: 3px;
    }
  }

  &__svg {
    position: absolute;
    inset: 0;
    overflow: visible;
  }

  // Hairline, solid, recessive.
  &__grid {
    stroke: var(--rw-grid, rgba(42, 23, 31, 0.09));
    stroke-width: 1;
  }

  &__stop {
    stop-color: var(--rw-accent, #d8267a);
  }

  &__area {
    animation: rw-fade-in 0.9s ease-out 0.5s both;
  }

  &__line {
    fill: none;
    stroke: var(--rw-accent, #d8267a);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1;
    animation: rw-draw 1.4s cubic-bezier(0.3, 0.7, 0.2, 1) both;
  }

  &__cross {
    stroke: color-mix(in srgb, var(--rw-ink, #2a171f) 38%, transparent);
    stroke-width: 1;
  }

  // 10px marker with a 2px surface ring so it stays legible over the line.
  &__dot {
    position: absolute;
    width: 10px;
    height: 10px;
    margin: -5px 0 0 -5px;
    border-radius: 50%;
    background: var(--rw-accent, #d8267a);
    box-shadow: 0 0 0 2px var(--rw-surface, #fdf7fb);
    pointer-events: none;

    &--end {
      animation: rw-dot-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.4) 1.1s both;
    }
  }

  &__tip {
    position: absolute;
    z-index: 2;
    display: grid;
    gap: 2px;
    min-width: max-content;
    padding: 7px 11px;
    border: 1px solid var(--rw-line, #ede4e7);
    border-radius: 12px;
    background: var(--rw-surface, #fdf7fb);
    box-shadow: 0 10px 28px -10px rgba(42, 23, 31, 0.3);
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 14px));
    animation: rw-fade-in 0.12s ease-out both;

    &.is-start {
      transform: translate(-12px, calc(-100% - 14px));
    }

    &.is-end {
      transform: translate(calc(-100% + 12px), calc(-100% - 14px));
    }

    &.is-below {
      transform: translate(-50%, 14px);
    }

    &.is-below.is-start {
      transform: translate(-12px, 14px);
    }

    &.is-below.is-end {
      transform: translate(calc(-100% + 12px), 14px);
    }
  }

  // Value first and strong; the date is secondary. A short line in the series color keys the value.
  &__tip-value {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--rw-ink, #2a171f);
    font-size: var(--s-font-size-small);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__key {
    width: 12px;
    height: 2px;
    border-radius: 1px;
    background: var(--rw-accent, #d8267a);
  }

  &__tip-date {
    color: var(--rw-muted, #6e6168);
    font-size: 11px;
  }

  &__x {
    grid-column: 2;
    display: flex;
    justify-content: space-between;
    color: var(--rw-faint, #796971);
    font-size: 10.5px;
    line-height: 1;
  }

  &__table {
    max-height: 220px;
    overflow: auto;
    border-radius: 8px;

    &:focus-visible {
      outline: 2px solid var(--s-color-focus-ring, #ab0555);
      outline-offset: 2px;
    }
  }
}

@keyframes rw-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes rw-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes rw-dot-in {
  from {
    opacity: 0;
    scale: 0;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rw-chart {
    transition: none;

    &__area,
    &__line,
    &__dot--end,
    &__tip {
      animation: none;
    }
  }
}
</style>
