<template>
  <figure class="equity" data-testid="quant-equity">
    <div class="equity-plot" @pointermove="inspect" @pointerleave="hover = null">
      <div class="equity-y" aria-hidden="true">
        <span>{{ formatPercent(scale.max) }}</span>
        <span>{{ formatPercent(scale.min) }}</span>
      </div>
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" role="img" :aria-label="ariaLabel">
        <defs>
          <linearGradient :id="ids.area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" class="area-top" />
            <stop offset="100%" class="area-bottom" />
          </linearGradient>
          <filter :id="ids.glow" x="-5%" y="-20%" width="110%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <rect
          v-for="(band, index) in bands"
          :key="band.key"
          class="equity-band"
          :class="{ odd: index % 2 }"
          :x="band.x"
          y="0"
          :width="band.width"
          height="260"
        />
        <path v-for="row in [40, 130, 220]" :key="row" class="equity-grid" :d="`M0 ${row} H800`" />
        <path class="equity-zero" :d="`M0 ${y(0)} H800`" />
        <path class="equity-price" :d="pricePath" />
        <path class="equity-area" :d="areaPath" :fill="`url(#${ids.area})`" />
        <path class="equity-glow" :d="strategyPath" :filter="`url(#${ids.glow})`" />
        <path class="equity-line" :d="strategyPath" />
        <circle
          v-for="fill in fillMarks"
          :key="fill.key"
          class="equity-fill"
          :class="fill.side"
          :cx="fill.x"
          :cy="fill.y"
          r="3.2"
        />
        <template v-if="hover !== null && series[hover]">
          <path class="equity-cursor" :d="`M${x(series[hover].timestamp)} 0 V260`" />
          <circle class="equity-dot" :cx="x(series[hover].timestamp)" :cy="y(series[hover].strategy)" r="5" />
        </template>
      </svg>
      <div v-if="hover !== null && series[hover]" class="equity-tip" :style="tipStyle" role="status">
        <time>{{ formatDate(series[hover].timestamp) }}</time>
        <span class="tip-strategy">{{ strategyLabel }} {{ formatPercent(series[hover].strategy) }}</span>
        <span class="tip-price">{{ priceLabel }} {{ formatPercent(series[hover].price) }}</span>
      </div>
    </div>
    <figcaption class="equity-legend">
      <span class="legend-strategy"
        >{{ strategyLabel }} <strong>{{ formatPercent(last?.strategy ?? 0) }}</strong></span
      >
      <span class="legend-price"
        >{{ priceLabel }} <strong>{{ formatPercent(last?.price ?? 0) }}</strong></span
      >
      <span class="legend-range">{{ formatDate(series[0]?.timestamp) }} – {{ formatDate(last?.timestamp) }}</span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import type { QuantEquityPoint, QuantFill, QuantFold } from '@/features/bot-trading/quant-loop';

defineOptions({ name: 'QuantEquity' });

/**
 * Chained walk-forward equity against the token's own price over the same blind hours.
 * Exact decimal strings are converted to numbers only to place pixels and labels.
 */
const props = defineProps<{
  points: QuantEquityPoint[];
  folds: QuantFold[];
  fills: QuantFill[];
  capital: string;
  strategyLabel: string;
  priceLabel: string;
  ariaLabel: string;
  /** Intl locale for dates; omitted uses the browser default. */
  locale?: string;
}>();

const base = useId();
const ids = { area: `${base}-area`, glow: `${base}-glow` };
const hover = ref<number | null>(null);

const series = computed(() => {
  const capital = Number(props.capital);
  const firstPrice = Number(props.points.find((point) => point.price)?.price ?? 0);
  return props.points.map((point) => ({
    timestamp: point.timestamp,
    strategy: (Number(point.value) / capital - 1) * 100,
    price: firstPrice > 0 && point.price ? (Number(point.price) / firstPrice - 1) * 100 : 0,
  }));
});
const last = computed(() => series.value[series.value.length - 1]);
const domain = computed(() => {
  const first = series.value[0]?.timestamp ?? 0;
  const end = last.value?.timestamp ?? first + 1;
  return { first, end: end > first ? end : first + 1 };
});
/**
 * The axis always fits the strategy curve; thin-pool price spikes are framed by their
 * 3rd–97th percentiles so a single outlier cannot flatten the comparison.
 */
const scale = computed(() => {
  const prices = series.value.map((point) => point.price).sort((a, b) => a - b);
  const quantile = (fraction: number) => (prices.length ? prices[Math.round(fraction * (prices.length - 1))] : 0);
  const values = [
    ...series.value.map((point) => point.strategy),
    quantile(0.03),
    quantile(0.97),
    last.value?.price ?? 0,
  ];
  const max = Math.max(5, ...values);
  const min = Math.min(-5, ...values);
  const pad = (max - min) * 0.08;
  return { max: max + pad, min: min - pad };
});
const x = (timestamp: number) => ((timestamp - domain.value.first) / (domain.value.end - domain.value.first)) * 800;
const y = (value: number) => 8 + ((scale.value.max - value) / (scale.value.max - scale.value.min)) * 244;
const path = (key: 'strategy' | 'price') =>
  series.value
    .map((point, index) => `${index ? 'L' : 'M'}${x(point.timestamp).toFixed(1)} ${y(point[key]).toFixed(1)}`)
    .join(' ');
const strategyPath = computed(() => path('strategy'));
const pricePath = computed(() => path('price'));
const areaPath = computed(() =>
  series.value.length ? `${strategyPath.value} L800 ${y(0).toFixed(1)} L0 ${y(0).toFixed(1)} Z` : ''
);
const bands = computed(() =>
  props.folds.map((fold) => {
    const start = Math.max(0, x(fold.startAt));
    return { key: fold.startAt, x: start, width: Math.max(0, Math.min(800, x(fold.endAt)) - start) };
  })
);
/** Place each fill on the strategy line at the nearest sampled hour. */
const fillMarks = computed(() =>
  props.fills.map((fill, index) => {
    let nearest = series.value[0];
    for (const point of series.value) if (point.timestamp <= fill.timestamp) nearest = point;
    return { key: `${fill.timestamp}-${index}`, side: fill.side, x: x(fill.timestamp), y: y(nearest?.strategy ?? 0) };
  })
);

function inspect(event: PointerEvent): void {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  if (!rect.width || !series.value.length) return;
  const at = domain.value.first + ((event.clientX - rect.left) / rect.width) * (domain.value.end - domain.value.first);
  let best = 0;
  series.value.forEach((point, index) => {
    if (Math.abs(point.timestamp - at) < Math.abs(series.value[best].timestamp - at)) best = index;
  });
  hover.value = best;
}
const tipStyle = computed(() => {
  if (hover.value === null || !series.value[hover.value]) return {};
  const left = (x(series.value[hover.value].timestamp) / 800) * 100;
  return { left: `${Math.min(78, Math.max(4, left))}%` };
});

const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
const formatDate = (timestamp?: number) =>
  timestamp
    ? new Date(timestamp).toLocaleDateString(props.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : '';
</script>

<style scoped lang="scss">
.equity {
  --equity-pink: var(--s-color-theme-accent, #f8087b);
  --equity-violet: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
  margin: 0;
  min-width: 0;
}
.equity-plot {
  position: relative;
  height: 230px;
  border-radius: 18px;
  background: var(--s-color-base-background, #faf4f8);
  box-shadow:
    inset 3px 3px 8px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    inset -3px -3px 8px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  overflow: hidden;
  touch-action: pan-y;
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}
.equity-y {
  position: absolute;
  inset: 8px auto 8px 10px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-base-content-secondary, #6e6168);
  pointer-events: none;
}
.equity-band {
  fill: transparent;
  &.odd {
    fill: color-mix(in srgb, var(--equity-violet) 6%, transparent);
  }
}
.equity-grid {
  stroke: color-mix(in srgb, var(--s-color-base-content-secondary, #6e6168) 14%, transparent);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.equity-zero {
  stroke: color-mix(in srgb, var(--s-color-base-content-secondary, #6e6168) 45%, transparent);
  stroke-dasharray: 4 5;
  vector-effect: non-scaling-stroke;
}
.equity-price {
  fill: none;
  stroke: var(--equity-violet);
  stroke-width: 1.8;
  stroke-dasharray: 6 5;
  opacity: 0.85;
  vector-effect: non-scaling-stroke;
}
.area-top {
  stop-color: var(--equity-pink);
  stop-opacity: 0.28;
}
.area-bottom {
  stop-color: var(--equity-pink);
  stop-opacity: 0;
}
.equity-line,
.equity-glow {
  fill: none;
  stroke: var(--equity-pink);
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.equity-line {
  stroke-width: 2.6;
}
.equity-glow {
  stroke-width: 9;
  opacity: 0.35;
}
.equity-fill {
  vector-effect: non-scaling-stroke;
  stroke: var(--s-color-utility-surface, #fdf7fb);
  stroke-width: 1.5;
  &.buy {
    fill: var(--equity-pink);
  }
  &.sell {
    fill: var(--equity-violet);
  }
}
.equity-cursor {
  stroke: color-mix(in srgb, var(--s-color-base-content-primary, #2a171f) 30%, transparent);
  vector-effect: non-scaling-stroke;
}
.equity-dot {
  fill: var(--s-color-utility-surface, #fdf7fb);
  stroke: var(--equity-pink);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}
.equity-tip {
  position: absolute;
  top: 12px;
  z-index: 2;
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 86%, transparent);
  box-shadow: 0 8px 20px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
  time {
    color: var(--s-color-base-content-secondary, #6e6168);
  }
}
.tip-strategy {
  color: var(--s-color-action-text, #ab0555);
  font-weight: 700;
}
.tip-price {
  color: var(--equity-violet);
}
.equity-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--s-color-base-content-secondary, #6e6168);
  strong {
    font-variant-numeric: tabular-nums;
    color: var(--s-color-base-content-primary, #2a171f);
  }
  span::before {
    content: '';
    display: inline-block;
    width: 14px;
    height: 3px;
    margin-inline-end: 6px;
    vertical-align: middle;
    border-radius: 2px;
  }
}
.equity-plot::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: linear-gradient(transparent, var(--equity-pink), transparent);
  box-shadow: 0 0 16px var(--equity-pink);
  opacity: 0;
  pointer-events: none;
}
@media (prefers-reduced-motion: no-preference) {
  /* Replay the walk-forward left to right, like a live tape, whenever a market opens. */
  .equity-plot svg {
    animation: equity-draw 1.8s cubic-bezier(0.45, 0, 0.2, 1) 0.2s both;
  }
  .equity-plot::after {
    animation: equity-cursor 1.8s cubic-bezier(0.45, 0, 0.2, 1) 0.2s both;
  }
}
@keyframes equity-draw {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
@keyframes equity-cursor {
  0% {
    left: 0;
    opacity: 1;
  }
  94% {
    left: calc(100% - 2px);
    opacity: 1;
  }
  100% {
    left: calc(100% - 2px);
    opacity: 0;
  }
}
.legend-strategy::before {
  background: var(--equity-pink);
}
.legend-price::before {
  background: repeating-linear-gradient(90deg, var(--equity-violet) 0 4px, transparent 4px 7px);
}
.legend-range {
  margin-inline-start: auto;
  &::before {
    display: none !important;
  }
}
</style>
