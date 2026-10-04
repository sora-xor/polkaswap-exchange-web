<template>
  <figure ref="root" class="parallel" :class="{ 'is-busy': busy }" data-testid="studio-parallel">
    <div class="parallel-scroller">
      <div
        ref="stage"
        class="parallel-stage"
        :style="{ '--parallel-axes': axes.length }"
        tabindex="0"
        role="group"
        :aria-label="ariaLabel"
        :aria-describedby="`${uid}-help`"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onCancel"
        @pointerleave="onLeave"
        @keydown="onKey"
      >
        <canvas ref="canvas" class="parallel-canvas" aria-hidden="true" />
        <div
          v-for="(axis, index) in axes"
          :key="axis.key"
          class="parallel-axis"
          :style="{ transform: `translateX(${axisX(index)}px)` }"
          aria-hidden="true"
        >
          <strong class="parallel-axis-title">{{ axis.label }}</strong>
          <span class="parallel-axis-max">{{ tickText(index, 'top') }}</span>
          <span class="parallel-axis-min">{{ tickText(index, 'bottom') }}</span>
          <span
            v-for="category in axis.categories ?? []"
            :key="category.value"
            class="parallel-axis-category"
            :style="{ top: `${yOf(index, category.value)}px` }"
            >{{ category.label }}</span
          >
        </div>
        <div
          v-if="hoverRow >= 0"
          class="parallel-tooltip"
          :style="{ transform: `translate(${tooltipAt.x}px, ${tooltipAt.y}px)` }"
          role="tooltip"
          data-testid="studio-parallel-tooltip"
        >
          <slot name="tooltip" :row="hoverRow" />
        </div>
      </div>
    </div>
    <figcaption class="parallel-caption">
      <span :id="`${uid}-help`">{{ help }}</span>
      <span class="parallel-count" data-testid="studio-parallel-count">{{ countText }}</span>
      <button
        v-if="brushes.size"
        type="button"
        class="parallel-clear"
        data-testid="studio-parallel-clear"
        @click="clear"
      >
        {{ clearLabel }}
      </button>
    </figcaption>
    <span ref="probeUp" class="parallel-probe parallel-probe--up" aria-hidden="true" />
    <span ref="probeDown" class="parallel-probe parallel-probe--down" aria-hidden="true" />
    <span ref="probeZero" class="parallel-probe parallel-probe--zero" aria-hidden="true" />
    <span ref="probeMuted" class="parallel-probe parallel-probe--muted" aria-hidden="true" />
    <span ref="probeAccent" class="parallel-probe parallel-probe--accent" aria-hidden="true" />
  </figure>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import { cssColor, divergingColor, niceScale, readProbe, type DivergingPalette, type Rgb } from './studio-colors';
import type { ParallelAxis } from './studio-types';

defineOptions({ name: 'QuantParallel' });

/**
 * Parallel coordinates: one line per tested strategy across settings and results. Dragging
 * along an axis keeps only the lines inside that range, so users can ask "which settings kept
 * working in the second half with a small drop?" and see the answer as a bundle of lines.
 * Line colour is the second-half result on the shared pink/blue ramp. Positions come from the
 * fast estimate; the tooltip slot shows exact numbers or plain rule text.
 */
const props = defineProps<{
  axes: ParallelAxis[];
  /** Row-major values; `columns` names each column. */
  data: Float32Array | null;
  columns: string[];
  rows: number;
  colorKey: string;
  /** Row of the current choice, or -1. */
  current: number;
  /** Rows to draw more strongly, such as strategies that passed every check. */
  strong?: Uint8Array | null;
  ariaLabel: string;
  help: string;
  clearLabel: string;
  /** Text for the number of lines inside every brushed range. */
  countLabel: (shown: number, total: number) => string;
  busy?: boolean;
  paused?: boolean;
}>();
const emit = defineEmits<{
  select: [row: number];
  hover: [row: number | null];
}>();

const uid = useId();
const root = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const probeUp = ref<HTMLElement | null>(null);
const probeDown = ref<HTMLElement | null>(null);
const probeZero = ref<HTMLElement | null>(null);
const probeMuted = ref<HTMLElement | null>(null);
const probeAccent = ref<HTMLElement | null>(null);
const width = ref(0);
const height = ref(320);
const hoverRow = ref(-1);
const tooltipAt = ref({ x: 0, y: 0 });
/** Brushed value range per axis key, in data units. */
const brushes = reactive(new Map<string, [number, number]>());

const PAD = { left: 48, right: 48, top: 54, bottom: 30 };
const REVEAL_MS = 760;

let palette: { ramp: DivergingPalette; muted: Rgb; accent: Rgb } = {
  ramp: { up: [0.67, 0.02, 0.33], zero: [0.8, 0.77, 0.79], down: [0.22, 0.47, 0.8] },
  muted: [0.47, 0.41, 0.44],
  accent: [0.97, 0.03, 0.48],
};
let layer: HTMLCanvasElement | null = null;
let layerDirty = true;
let revealStart = 0;
let frame = 0;
let brushing: { key: string; axis: number; from: number; id: number; moved: boolean } | null = null;
let pressed: { x: number; y: number; id: number } | null = null;
let resize: ResizeObserver | null = null;
let theme: MutationObserver | null = null;
let motion: MediaQueryList | null = null;
let reduced = false;

const stride = computed(() => props.columns.length);
const columnOf = computed(() => props.axes.map((axis) => props.columns.indexOf(axis.key)));
const colorColumn = computed(() => props.columns.indexOf(props.colorKey));
const value = (row: number, column: number) => (props.data ? props.data[row * stride.value + column] : NaN);

/**
 * Value at the top and bottom of each axis: its declared domain, or the data range with a small
 * margin that never crosses the axis floor. Inverted axes put small values at the top.
 */
const domains = computed(() =>
  props.axes.map((axis, index) => {
    let low: number;
    let high: number;
    if (axis.categories?.length) {
      const values = axis.categories.map((category) => category.value);
      low = Math.min(...values) - 0.5;
      high = Math.max(...values) + 0.5;
    } else if (axis.domain) [low, high] = axis.domain;
    else {
      low = Infinity;
      high = -Infinity;
      const column = columnOf.value[index];
      for (let row = 0; row < props.rows; row++) {
        const item = value(row, column);
        if (!Number.isFinite(item)) continue;
        low = Math.min(low, item);
        high = Math.max(high, item);
      }
      if (Number.isFinite(low) && axis.baseline !== undefined) {
        low = Math.min(low, axis.baseline);
        high = Math.max(high, axis.baseline);
      }
      if (!Number.isFinite(low)) [low, high] = [0, 1];
      else if (high - low < 1e-9) [low, high] = [low - 1, high + 1];
      else {
        const pad = (high - low) * 0.04;
        low -= pad;
        high += pad;
      }
      if (axis.floor !== undefined) low = Math.max(axis.floor, low);
      if (axis.ceil !== undefined) high = Math.min(axis.ceil, high);
    }
    return axis.invert ? { top: low, bottom: high } : { top: high, bottom: low };
  })
);
const colorScale = computed(() => {
  const column = colorColumn.value;
  if (column < 0 || !props.data) return 0.1;
  const values = new Float32Array(props.rows);
  for (let row = 0; row < props.rows; row++) values[row] = value(row, column);
  return niceScale(values);
});

const axisX = (index: number) =>
  PAD.left + (props.axes.length > 1 ? (index / (props.axes.length - 1)) * (width.value - PAD.left - PAD.right) : 0);
const plotHeight = () => height.value - PAD.top - PAD.bottom;
function yOf(index: number, item: number): number {
  const { top, bottom } = domains.value[index];
  return PAD.top + ((top - item) / (top - bottom)) * plotHeight();
}
function valueAtY(index: number, y: number): number {
  const { top, bottom } = domains.value[index];
  return top - ((y - PAD.top) / plotHeight()) * (top - bottom);
}
function tickText(index: number, end: 'top' | 'bottom'): string {
  const axis = props.axes[index];
  if (axis.categories?.length) return '';
  return axis.format(domains.value[index][end]);
}

/** Rows inside every brushed range. */
const passing = computed(() => {
  const keep = new Uint8Array(props.rows).fill(1);
  if (!brushes.size) return keep;
  props.axes.forEach((axis, index) => {
    const range = brushes.get(axis.key);
    if (!range) return;
    const column = columnOf.value[index];
    for (let row = 0; row < props.rows; row++) {
      const item = value(row, column);
      if (!(item >= range[0] && item <= range[1])) keep[row] = 0;
    }
  });
  return keep;
});
const shown = computed(() => passing.value.reduce((total, item) => total + item, 0));
const countText = computed(() => props.countLabel(shown.value, props.rows));

/** Draw order: faint lines first, then the strongest colours on top. */
const order = computed(() => {
  const column = colorColumn.value;
  return Array.from({ length: props.rows }, (_value, row) => row).sort(
    (a, b) => Math.abs(value(a, column)) - Math.abs(value(b, column))
  );
});
/** A stable shuffled order for the streaming reveal. */
const revealRank = computed(() => {
  const rank = new Uint32Array(props.rows);
  for (let row = 0; row < props.rows; row++) rank[row] = (Math.imul(row + 1, 2654435761) >>> 0) % 997;
  return rank;
});

function strokeRow(context: CanvasRenderingContext2D, row: number): void {
  context.beginPath();
  props.axes.forEach((_axis, index) => {
    const y = yOf(index, value(row, columnOf.value[index]));
    if (index === 0) context.moveTo(axisX(index), y);
    else context.lineTo(axisX(index), y);
  });
  context.stroke();
}

/** Redraw every line into the offscreen layer; during the reveal only rows whose rank has arrived. */
function paintLayer(progress: number): void {
  if (!layer) layer = document.createElement('canvas');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  layer.width = Math.round(width.value * ratio);
  layer.height = Math.round(height.value * ratio);
  const context = layer.getContext('2d');
  if (!context || !props.data) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width.value, height.value);
  context.lineJoin = 'round';
  const keep = passing.value;
  const cutoff = progress * 997;
  const dense = props.rows > 1500;
  const column = colorColumn.value;
  // Lines outside the brushes stay as a quiet grey context.
  context.lineWidth = 1;
  context.strokeStyle = cssColor(palette.muted, dense ? 0.035 : 0.07);
  for (const row of order.value) if (!keep[row] && revealRank.value[row] <= cutoff) strokeRow(context, row);
  for (const row of order.value) {
    if (!keep[row] || revealRank.value[row] > cutoff) continue;
    const strong = props.strong?.[row] === 1;
    const alpha = brushes.size ? (dense ? 0.4 : 0.6) : dense ? 0.14 : 0.3;
    context.lineWidth = strong ? 1.6 : 1;
    context.strokeStyle = cssColor(
      divergingColor(value(row, column), colorScale.value, palette.ramp),
      Math.min(1, strong ? alpha * 1.8 : alpha)
    );
    strokeRow(context, row);
  }
  layerDirty = false;
}

function draw(time: number): boolean {
  const element = canvas.value;
  const context = element?.getContext('2d');
  if (!element || !context) return false;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  if (element.width !== Math.round(width.value * ratio) || element.height !== Math.round(height.value * ratio)) {
    element.width = Math.round(width.value * ratio);
    element.height = Math.round(height.value * ratio);
    layerDirty = true;
  }
  let progress = 1;
  if (revealStart && !reduced) {
    progress = Math.min(1, (time - revealStart) / REVEAL_MS);
    if (progress >= 1) revealStart = 0;
    layerDirty = true;
  }
  if (layerDirty) paintLayer(progress);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width.value, height.value);
  if (layer) context.drawImage(layer, 0, 0, width.value, height.value);

  // Axes and brushes.
  props.axes.forEach((axis, index) => {
    const x = axisX(index);
    context.strokeStyle = cssColor(palette.muted, 0.5);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, PAD.top);
    context.lineTo(x, PAD.top + plotHeight());
    context.stroke();
    const range = brushes.get(axis.key);
    if (range) {
      const top = yOf(index, range[1]);
      const bottom = yOf(index, range[0]);
      context.fillStyle = cssColor(palette.accent, 0.16);
      context.strokeStyle = cssColor(palette.accent, 0.9);
      context.lineWidth = 1.5;
      context.beginPath();
      context.roundRect?.(x - 9, top, 18, Math.max(2, bottom - top), 6);
      if (!context.roundRect) context.rect(x - 9, top, 18, Math.max(2, bottom - top));
      context.fill();
      context.stroke();
    }
  });

  // The current choice and the hovered line, on top of everything.
  const pulse = reduced || props.paused ? 0.5 : (Math.sin(time / 420) + 1) / 2;
  const emphasise = (row: number, lineWidth: number, glow: number) => {
    if (row < 0 || row >= props.rows) return;
    const color = divergingColor(value(row, colorColumn.value), colorScale.value, palette.ramp);
    context.lineJoin = 'round';
    context.strokeStyle = cssColor(palette.accent, 0.18 + glow * 0.22);
    context.lineWidth = lineWidth + 6;
    strokeRow(context, row);
    context.strokeStyle = cssColor(color, 1);
    context.lineWidth = lineWidth;
    strokeRow(context, row);
    props.axes.forEach((_axis, index) => {
      context.beginPath();
      context.arc(axisX(index), yOf(index, value(row, columnOf.value[index])), 3.5, 0, Math.PI * 2);
      context.fillStyle = cssColor(palette.accent);
      context.fill();
    });
  };
  emphasise(props.current, 2.6, pulse);
  if (hoverRow.value !== props.current) emphasise(hoverRow.value, 2.2, 0.6);
  return !!revealStart || (props.current >= 0 && !reduced && !props.paused);
}

function loop(time: number): void {
  frame = 0;
  if (draw(time) && !props.paused && document.visibilityState === 'visible') frame = requestAnimationFrame(loop);
}
function schedule(): void {
  if (!frame && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------------------------------------
 * Interaction
 * ------------------------------------------------------------------------------------------- */

function localPoint(event: PointerEvent) {
  const rect = stage.value?.getBoundingClientRect();
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
}
function axisNear(x: number): number {
  for (let index = 0; index < props.axes.length; index++) if (Math.abs(axisX(index) - x) <= 14) return index;
  return -1;
}

/** The passing row whose line runs closest to the pointer, within 7px. */
function nearestRow(x: number, y: number): number {
  if (!props.data || props.axes.length < 2) return -1;
  let segment = -1;
  for (let index = 0; index < props.axes.length - 1; index++)
    if (x >= axisX(index) && x <= axisX(index + 1)) segment = index;
  if (segment < 0) return -1;
  const share = (x - axisX(segment)) / Math.max(1, axisX(segment + 1) - axisX(segment));
  const keep = passing.value;
  let best = -1;
  let distance = 7;
  for (let row = 0; row < props.rows; row++) {
    if (!keep[row]) continue;
    const a = yOf(segment, value(row, columnOf.value[segment]));
    const b = yOf(segment + 1, value(row, columnOf.value[segment + 1]));
    const gap = Math.abs(a + (b - a) * share - y);
    if (gap < distance) {
      distance = gap;
      best = row;
    }
  }
  return best;
}

function setHover(row: number, at?: { x: number; y: number }): void {
  if (at) tooltipAt.value = { x: Math.min(width.value - 120, Math.max(120, at.x)), y: Math.max(8, at.y - 12) };
  if (hoverRow.value === row) return;
  hoverRow.value = row;
  emit('hover', row >= 0 ? row : null);
  schedule();
}

function onDown(event: PointerEvent): void {
  const at = localPoint(event);
  const axis = axisNear(at.x);
  if (axis >= 0 && at.y >= PAD.top - 6 && at.y <= PAD.top + plotHeight() + 6) {
    brushing = { key: props.axes[axis].key, axis, from: valueAtY(axis, at.y), id: event.pointerId, moved: false };
    stage.value?.setPointerCapture?.(event.pointerId);
    setHover(-1);
    return;
  }
  pressed = { x: at.x, y: at.y, id: event.pointerId };
}
function onMove(event: PointerEvent): void {
  const at = localPoint(event);
  if (brushing && brushing.id === event.pointerId) {
    const to = valueAtY(brushing.axis, Math.min(PAD.top + plotHeight(), Math.max(PAD.top, at.y)));
    if (Math.abs(to - brushing.from) > 1e-9) {
      brushing.moved = true;
      brushes.set(brushing.key, [Math.min(brushing.from, to), Math.max(brushing.from, to)]);
      layerDirty = true;
      schedule();
    }
    return;
  }
  if (stage.value) stage.value.style.cursor = axisNear(at.x) >= 0 ? 'ns-resize' : 'pointer';
  setHover(nearestRow(at.x, at.y), at);
}
function onUp(event: PointerEvent): void {
  const at = localPoint(event);
  if (brushing && brushing.id === event.pointerId) {
    // A click on an axis without dragging clears that axis' range.
    if (!brushing.moved && brushes.delete(brushing.key)) layerDirty = true;
    stage.value?.releasePointerCapture?.(event.pointerId);
    brushing = null;
    schedule();
    return;
  }
  if (pressed && pressed.id === event.pointerId && Math.hypot(at.x - pressed.x, at.y - pressed.y) < 5) {
    const row = nearestRow(at.x, at.y);
    if (row >= 0) emit('select', row);
  }
  pressed = null;
}
function onCancel(): void {
  brushing = null;
  pressed = null;
}
function onLeave(): void {
  if (!brushing) setHover(-1);
}
function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && brushes.size) {
    event.preventDefault();
    clear();
  }
}
function clear(): void {
  brushes.clear();
  layerDirty = true;
  schedule();
}

/* ---------------------------------------------------------------------------------------------
 * Lifecycle
 * ------------------------------------------------------------------------------------------- */

function readColors(): void {
  palette = {
    ramp: {
      up: readProbe(probeUp.value, palette.ramp.up),
      down: readProbe(probeDown.value, palette.ramp.down),
      zero: readProbe(probeZero.value, palette.ramp.zero),
    },
    muted: readProbe(probeMuted.value, palette.muted),
    accent: readProbe(probeAccent.value, palette.accent),
  };
  layerDirty = true;
}
function size(): void {
  width.value = stage.value?.clientWidth ?? 0;
  height.value = stage.value?.clientHeight ?? 320;
  layerDirty = true;
  schedule();
}
const onMotion = (event: MediaQueryListEvent) => {
  reduced = event.matches;
  schedule();
};
const onVisibility = () => schedule();

onMounted(() => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  reduced = motion?.matches ?? false;
  motion?.addEventListener?.('change', onMotion);
  readColors();
  size();
  revealStart = performance.now();
  if (typeof ResizeObserver !== 'undefined' && stage.value) {
    resize = new ResizeObserver(size);
    resize.observe(stage.value);
  }
  theme = new MutationObserver(() => {
    readColors();
    schedule();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'design-system-theme'] });
  document.addEventListener('visibilitychange', onVisibility);
});

// New data streams in; brushes on axes that no longer exist are dropped.
watch(
  () => [props.data, props.axes.map((axis) => axis.key).join()],
  ([, keys], previous) => {
    const names = String(keys).split(',');
    for (const key of [...brushes.keys()]) if (!names.includes(key)) brushes.delete(key);
    if (hoverRow.value >= props.rows) hoverRow.value = -1;
    if (!previous || previous[1] !== keys) revealStart = performance.now();
    else if (!revealStart) revealStart = performance.now();
    layerDirty = true;
    schedule();
  }
);
watch(
  () => [props.current, props.paused, props.strong],
  () => schedule()
);

defineExpose({ clear });

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  layer = null;
  resize?.disconnect();
  theme?.disconnect();
  motion?.removeEventListener?.('change', onMotion);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<style scoped lang="scss">
.parallel {
  position: relative;
  margin: 0;
  min-width: 0;
  display: grid;
  gap: 10px;
}
/* Narrow screens scroll the chart sideways instead of squeezing the axes together. */
.parallel-scroller {
  min-width: 0;
  overflow-x: auto;
  border-radius: 22px;
}
.parallel-stage {
  position: relative;
  min-width: calc(var(--parallel-axes, 6) * 78px);
  height: 320px;
  border-radius: 22px;
  overflow: hidden;
  touch-action: manipulation;
  outline: none;
  background: var(--s-color-base-background, #faf4f8);
  box-shadow:
    inset 3px 3px 9px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    inset -3px -3px 9px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  transition: opacity 200ms ease;
  &:focus-visible {
    box-shadow:
      inset 3px 3px 9px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
      0 0 0 3px var(--s-color-focus-ring, #ab0555);
  }
}
.is-busy .parallel-stage {
  opacity: 0.72;
}
.parallel-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.parallel-axis {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 0;
  pointer-events: none;
}
.parallel-axis-title,
.parallel-axis-max,
.parallel-axis-min,
.parallel-axis-category {
  position: absolute;
  left: 0;
  translate: -50% 0;
  white-space: nowrap;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-base-content-secondary, #6e6168);
}
.parallel-axis-title {
  top: 6px;
  width: max-content;
  max-width: 92px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  text-align: center;
  line-height: 1.15;
  font-weight: 700;
  color: var(--s-color-base-content-primary, #2a171f);
}
.parallel-axis-max {
  top: 36px;
}
.parallel-axis-min {
  bottom: 8px;
}
.parallel-axis-category {
  translate: 8px -50%;
  padding: 1px 6px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 88%, transparent);
}
.parallel-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: grid;
  gap: 2px;
  min-width: 190px;
  max-width: 260px;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--s-color-base-content-primary, #2a171f);
  background: color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 94%, transparent);
  box-shadow: var(--s-shadow-dialog, 0 8px 24px rgba(0, 0, 0, 0.14));
  pointer-events: none;
  translate: -50% -100%;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.parallel-caption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 12px;
  color: var(--s-color-base-content-tertiary, #796971);
}
.parallel-count {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-base-content-secondary, #6e6168);
}
.parallel-clear {
  min-height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 700;
  color: var(--s-color-action-text, #ab0555);
  background: transparent;
  cursor: pointer;
  &:focus-visible {
    outline: 3px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }
}
.parallel-probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
.parallel-probe--up {
  color: var(--s-color-action-text, #ab0555);
}
.parallel-probe--down {
  color: color-mix(in srgb, var(--s-color-status-info, #479aef) 82%, var(--s-color-base-content-primary, #2a171f));
}
.parallel-probe--zero {
  color: color-mix(in srgb, var(--s-color-base-content-tertiary, #796971) 38%, var(--s-color-utility-surface, #fdf7fb));
}
.parallel-probe--muted {
  color: var(--s-color-base-content-tertiary, #796971);
}
.parallel-probe--accent {
  color: var(--s-color-theme-accent, #f8087b);
}
</style>
