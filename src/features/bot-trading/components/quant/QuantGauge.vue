<template>
  <figure class="gauge" :class="`gauge--${state}`">
    <svg viewBox="0 0 200 150" role="img" :aria-label="ariaLabel">
      <defs>
        <filter :id="glowId" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <path class="gauge-track-shadow" :d="arc(MIN, MAX)" />
      <path class="gauge-track" :d="arc(MIN, MAX)" />
      <path class="gauge-zone gauge-zone--buy" :d="arc(MIN, clamp(threshold))" />
      <path v-if="exit !== null" class="gauge-zone gauge-zone--sell" :d="arc(clamp(exit), MAX)" />
      <template v-if="value !== null">
        <line
          class="gauge-needle"
          :x1="CX"
          :y1="CY"
          :x2="point(clamp(needle), R - 16).x"
          :y2="point(clamp(needle), R - 16).y"
        />
        <circle
          class="gauge-knob-glow"
          :cx="point(clamp(needle)).x"
          :cy="point(clamp(needle)).y"
          r="11"
          :filter="`url(#${glowId})`"
        />
        <circle class="gauge-knob" :cx="point(clamp(needle)).x" :cy="point(clamp(needle)).y" r="7" />
      </template>
      <circle class="gauge-hub" :cx="CX" :cy="CY" r="5" />
    </svg>
    <figcaption>
      <strong>{{ shownText }}</strong>
      <span>{{ label }}</span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { useCountUp } from '@/features/bot-trading/useCountUp';

defineOptions({ name: 'QuantGauge' });

/**
 * Neumorphic dial for a market's distance from its rule mean. Values are display-only
 * conversions of exact rule evidence; zones mark the researched buy and sell triggers.
 */
const props = defineProps<{
  value: number | null;
  threshold: number;
  exit: number | null;
  state: string;
  valueText: string;
  label: string;
  ariaLabel: string;
}>();

const MIN = -50;
const MAX = 50;
const CX = 100;
const CY = 96;
const R = 74;
const START = 150;
const SWEEP = 240;
const glowId = `${useId()}-glow`;
/** The needle sweeps in from the dial minimum; the exact value is the tween's target. */
const target = computed(() => props.value ?? MIN);
const needle = useCountUp(target, 1100, MIN);
const shownText = computed(() =>
  props.value === null || Math.abs(needle.value - props.value) < 0.05
    ? props.valueText
    : `${needle.value > 0 ? '+' : ''}${needle.value.toFixed(1)}%`
);

const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value));
const angle = (value: number) => ((START + (SWEEP * (value - MIN)) / (MAX - MIN)) * Math.PI) / 180;
function point(value: number, radius = R) {
  const theta = angle(value);
  return { x: CX + radius * Math.cos(theta), y: CY + radius * Math.sin(theta) };
}
/** Clockwise arc between two dial values. */
function arc(from: number, to: number): string {
  if (to <= from) return '';
  const a = point(from);
  const b = point(to);
  const large = (SWEEP * (to - from)) / (MAX - MIN) > 180 ? 1 : 0;
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}
</script>

<style scoped lang="scss">
.gauge {
  --gauge-pink: var(--s-color-theme-accent, #f8087b);
  --gauge-violet: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
  position: relative;
  margin: 0;
  width: 100%;
  max-width: 190px;
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  figcaption {
    position: absolute;
    inset: auto 0 6px;
    display: grid;
    justify-items: center;
    gap: 2px;
    text-align: center;
    pointer-events: none;
  }
  strong {
    /* Keeps "+17.6%" in order inside right-to-left languages. */
    direction: ltr;
    unicode-bidi: isolate;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--s-color-base-content-primary, #2a171f);
  }
  span {
    font-size: 11px;
    color: var(--s-color-base-content-secondary, #6e6168);
  }
}
.gauge-track,
.gauge-track-shadow,
.gauge-zone {
  fill: none;
  stroke-linecap: round;
}
.gauge-track-shadow {
  stroke: var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1));
  stroke-width: 20;
  transform: translate(1.5px, 2px);
}
.gauge-track {
  stroke: var(--s-color-base-background, #faf4f8);
  stroke-width: 18;
}
.gauge-zone {
  stroke-width: 8;
}
.gauge-zone--buy {
  stroke: color-mix(in srgb, var(--gauge-pink) 70%, transparent);
}
.gauge-zone--sell {
  stroke: color-mix(in srgb, var(--gauge-violet) 70%, transparent);
}
.gauge-needle {
  stroke: color-mix(in srgb, var(--s-color-base-content-primary, #2a171f) 55%, transparent);
  stroke-width: 2;
  stroke-linecap: round;
}
.gauge-hub {
  fill: var(--s-color-base-content-primary, #2a171f);
}
.gauge-knob {
  fill: var(--s-color-utility-surface, #fdf7fb);
  stroke: var(--gauge-violet);
  stroke-width: 3;
}
.gauge-knob-glow {
  fill: color-mix(in srgb, var(--gauge-violet) 55%, transparent);
}
.gauge--entry {
  .gauge-knob {
    stroke: var(--gauge-pink);
  }
  .gauge-knob-glow {
    fill: color-mix(in srgb, var(--gauge-pink) 70%, transparent);
  }
}
@media (prefers-reduced-motion: no-preference) {
  .gauge--entry .gauge-knob-glow {
    animation: gauge-pulse 1.8s ease-in-out infinite;
    animation-play-state: var(--quant-motion, running);
    transform-box: fill-box;
    transform-origin: center;
  }
}
@keyframes gauge-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.35);
  }
}
</style>
