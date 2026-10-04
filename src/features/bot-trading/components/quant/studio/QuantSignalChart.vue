<template>
  <figure class="signal" :class="{ 'is-busy': busy }" data-testid="studio-signal-chart">
    <div
      ref="stage"
      class="signal-stage"
      :style="{ height: `${stageHeight}px` }"
      @pointerdown="onStageDown"
      @pointermove="onStageMove"
      @pointerup="onStageUp"
      @pointercancel="endDrag"
      @pointerleave="onStageLeave"
    >
      <canvas ref="canvas" class="signal-canvas" aria-hidden="true" />
      <button
        v-for="handle in handles"
        :key="handle.role"
        type="button"
        class="signal-handle"
        :class="[`signal-handle--${handle.role}`, { 'is-active': dragging === handle.role }]"
        :style="{ transform: `translateY(${handle.y}px)` }"
        role="slider"
        :aria-label="handle.label"
        :aria-valuemin="handle.min"
        :aria-valuemax="handle.max"
        :aria-valuenow="handle.value"
        :aria-valuetext="handle.text"
        :data-testid="`studio-handle-${handle.role}`"
        @pointerdown.stop="startDrag(handle.role, $event)"
        @keydown="onHandleKey(handle.role, $event)"
      >
        <span aria-hidden="true">⇕</span>{{ handle.text }}
      </button>
      <div
        v-if="hover"
        class="signal-tip"
        :style="{ transform: `translate(${hover.x}px, ${hover.y}px)` }"
        role="status"
        data-testid="studio-signal-tip"
      >
        <time>{{ hover.date }}</time>
        <span v-for="row in hover.rows" :key="row.label"
          ><i :class="`signal-key signal-key--${row.tone}`" aria-hidden="true" />{{ row.label }}
          <strong>{{ row.value }}</strong></span
        >
      </div>
    </div>
    <div class="signal-toolbar">
      <button
        type="button"
        class="signal-play"
        data-testid="studio-replay"
        :aria-pressed="playing"
        :disabled="!series || reduced"
        @click="togglePlay"
      >
        <span aria-hidden="true">{{ playing ? '■' : '▶' }}</span> {{ playing ? labels.stop : labels.replay }}
      </button>
      <ul class="signal-legend">
        <li><i class="signal-key signal-key--price" aria-hidden="true" />{{ labels.price }}</li>
        <li><i class="signal-key signal-key--buy" aria-hidden="true" />{{ labels.buys }}</li>
        <li><i class="signal-key signal-key--sell" aria-hidden="true" />{{ labels.sells }}</li>
        <li><i class="signal-key signal-key--bot" aria-hidden="true" />{{ labels.bot }}</li>
        <li><i class="signal-key signal-key--hold" aria-hidden="true" />{{ labels.hold }}</li>
      </ul>
    </div>
    <p class="signal-summary">{{ summary }}</p>
    <span ref="probeInk" class="signal-probe signal-probe--ink" aria-hidden="true" />
    <span ref="probeMuted" class="signal-probe signal-probe--muted" aria-hidden="true" />
    <span ref="probeBuy" class="signal-probe signal-probe--buy" aria-hidden="true" />
    <span ref="probeSell" class="signal-probe signal-probe--sell" aria-hidden="true" />
    <span ref="probeSurface" class="signal-probe signal-probe--surface" aria-hidden="true" />
  </figure>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  snapToGrid,
  type StudioRecipe,
  type StudioReplay,
  type StudioSeries,
} from '@/features/bot-trading/quant-studio';
import { cssColor, readProbe, type Rgb } from './studio-colors';
import type { SignalChartLabels } from './studio-types';

defineOptions({ name: 'QuantSignalChart' });

/**
 * Price, the rules' indicators and the bot's value over the whole archive, split into the
 * first half (where users tune) and the second half (the check). The buy and sell lines are
 * draggable sliders that snap to the recipe's grid. Trade marks and the value line come from
 * the exact replay when it matches the current choice, otherwise from the fast preview.
 */
const props = defineProps<{
  series: StudioSeries | null;
  replay: StudioReplay | null;
  /** True when `replay` was computed for the current choice. */
  replayCurrent: boolean;
  recipe: StudioRecipe;
  values: Record<string, number>;
  labels: SignalChartLabels;
  /** Format an indicator value (percent or index level) for axis ticks and handles. */
  formatLine: (role: 'buy' | 'sell', value: number) => string;
  formatPercent: (fraction: number) => string;
  formatPrice: (value: number) => string;
  formatDate: (timestamp: number) => string;
  summary: string;
  busy?: boolean;
  paused?: boolean;
}>();
const emit = defineEmits<{ change: [values: Record<string, number>] }>();

type Role = 'buy' | 'sell';
interface Panel {
  key: 'price' | 'buy' | 'sell' | 'equity';
  top: number;
  height: number;
  min: number;
  max: number;
}

const HOUR = 3_600_000;
const PAD = { right: 96, top: 24, bottom: 24 };
const TICK_FONT = '11px system-ui, sans-serif';
const GAP = 12;
const REVEAL_MS = 900;
const PLAY_MS = 8_000;

const stage = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const probeInk = ref<HTMLElement | null>(null);
const probeMuted = ref<HTMLElement | null>(null);
const probeBuy = ref<HTMLElement | null>(null);
const probeSell = ref<HTMLElement | null>(null);
const probeSurface = ref<HTMLElement | null>(null);
const width = ref(0);
const playing = ref(false);
const reduced = ref(false);
const dragging = ref<Role | null>(null);
const hover = ref<{
  x: number;
  y: number;
  date: string;
  rows: { label: string; value: string; tone: string }[];
} | null>(null);

let colors: Record<'ink' | 'muted' | 'buy' | 'sell' | 'surface', Rgb> = {
  ink: [0.16, 0.09, 0.12],
  muted: [0.47, 0.41, 0.44],
  buy: [0.97, 0.03, 0.48],
  sell: [0.62, 0.36, 0.82],
  surface: [0.99, 0.97, 0.98],
};
let frame = 0;
let revealStart = 0;
let playStart = 0;
let playFrom = 0;
let resize: ResizeObserver | null = null;
let theme: MutationObserver | null = null;
let motion: MediaQueryList | null = null;

const sellShared = computed(() => !!props.series?.shared);
const hasSellPanel = computed(() => !!props.recipe.sellLine && !sellShared.value && !!props.series?.sell);
const stageHeight = computed(() => (hasSellPanel.value ? 470 : 410));
const count = computed(() => props.series?.price.length ?? 0);

/** Finite values of a series between percentiles, so a single spike cannot flatten the panel. */
function robustRange(values: ArrayLike<number> | null, extra: number[] = []): { min: number; max: number } {
  const finite: number[] = [];
  if (values)
    for (let index = 0; index < values.length; index++) if (Number.isFinite(values[index])) finite.push(values[index]);
  finite.sort((a, b) => a - b);
  let min = finite.length ? finite[Math.floor(finite.length * 0.005)] : 0;
  let max = finite.length ? finite[Math.ceil((finite.length - 1) * 0.995)] : 1;
  for (const value of extra) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (max - min < 1e-12) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

/** Thresholds a line can reach: every grid value of its parameter, mapped to the indicator. */
function lineExtent(role: Role): number[] {
  const line = role === 'buy' ? props.recipe.buyLine : props.recipe.sellLine;
  const param = line && props.recipe.params.find((item) => item.key === line.param);
  return line && param ? param.values.map((value) => value * line.sign) : [];
}

const lineValue = (role: Role) => {
  const line = role === 'buy' ? props.recipe.buyLine : props.recipe.sellLine;
  return line ? props.values[line.param] * line.sign : NaN;
};

/** Relative bot value per bar: exact chained equity when current, else the preview trace. */
const botPath = computed(() => {
  const series = props.series;
  if (!series) return null;
  if (props.replayCurrent && props.replay) {
    const points: { index: number; value: number }[] = [];
    for (const half of [props.replay.first, props.replay.second])
      for (const point of half.equity)
        points.push({ index: Math.round((point.timestamp - series.startAt) / HOUR), value: Number(point.value) / 10 });
    return points;
  }
  const points: { index: number; value: number }[] = [];
  const step = Math.max(1, Math.floor(series.trace.value.length / 600));
  for (let index = 0; index < series.trace.value.length; index += step)
    points.push({ index, value: series.trace.value[index] });
  return points;
});

/** Fill marks: exact fills when current, else the preview trace's fill bars. */
const marks = computed(() => {
  const series = props.series;
  if (!series) return [] as { index: number; side: Role }[];
  if (props.replayCurrent && props.replay)
    return [...props.replay.first.fills, ...props.replay.second.fills].map((fill) => ({
      index: Math.round((fill.timestamp - series.startAt) / HOUR),
      side: fill.side as Role,
    }));
  return [
    ...series.trace.buys.map((index) => ({ index, side: 'buy' as Role })),
    ...series.trace.sells.map((index) => ({ index, side: 'sell' as Role })),
  ];
});

const panels = computed<Panel[]>(() => {
  const series = props.series;
  const total = stageHeight.value - PAD.top - PAD.bottom;
  const shares = hasSellPanel.value ? [0.4, 0.21, 0.17, 0.22] : [0.46, 0.27, 0, 0.27];
  const keys: Panel['key'][] = ['price', 'buy', 'sell', 'equity'];
  const usable = total - GAP * (hasSellPanel.value ? 3 : 2);
  let top = PAD.top;
  const list: Panel[] = [];
  keys.forEach((key, index) => {
    if (!shares[index]) return;
    const height = usable * shares[index];
    let range = { min: 0, max: 1 };
    if (series) {
      if (key === 'price') range = robustRange(series.price);
      else if (key === 'buy')
        range = robustRange(series.buy, [...lineExtent('buy'), ...(sellShared.value ? lineExtent('sell') : [])]);
      else if (key === 'sell') range = robustRange(series.sell, lineExtent('sell'));
      else range = equityRange();
    }
    list.push({ key, top, height, ...range });
    top += height + GAP;
  });
  return list;
});

function equityRange(): { min: number; max: number } {
  const series = props.series;
  const values = [0];
  for (const point of botPath.value ?? []) values.push(point.value - 1);
  if (series) {
    const step = Math.max(1, Math.floor(series.price.length / 400));
    for (let index = 0; index < series.price.length; index += step) {
      const start = index < series.split ? series.price[0] : series.price[series.split];
      values.push(series.price[index] / start - 1);
    }
  }
  return robustRange(values);
}

let measurer: CanvasRenderingContext2D | null = null;
/** Left margin wide enough for the longest tick label, so small prices never clip. */
const padLeft = computed(() => {
  if (typeof document === 'undefined') return 58;
  measurer ??= document.createElement('canvas').getContext('2d');
  if (!measurer) return 58;
  measurer.font = TICK_FONT;
  let widest = 0;
  for (const panel of panels.value)
    for (const value of [panel.max, panel.min])
      widest = Math.max(widest, measurer.measureText(tickLabel(panel, value)).width);
  return Math.min(110, Math.max(46, Math.ceil(widest) + 12));
});
/** Axis tick text for a panel value. */
function tickLabel(panel: Panel, value: number): string {
  if (panel.key === 'price') return props.formatPrice(value);
  if (panel.key === 'equity') return props.formatPercent(value);
  return props.formatLine(panel.key === 'sell' ? 'sell' : 'buy', value);
}
const plotWidth = computed(() => Math.max(1, width.value - padLeft.value - PAD.right));
const xOf = (index: number) => padLeft.value + (index / Math.max(1, count.value - 1)) * plotWidth.value;
const indexOf = (x: number) => Math.round(((x - padLeft.value) / plotWidth.value) * Math.max(1, count.value - 1));
const yOf = (panel: Panel, value: number) => panel.top + ((panel.max - value) / (panel.max - panel.min)) * panel.height;
const valueAt = (panel: Panel, y: number) => panel.max - ((y - panel.top) / panel.height) * (panel.max - panel.min);
const panelFor = (role: Role) =>
  panels.value.find((panel) => panel.key === (role === 'sell' && hasSellPanel.value ? 'sell' : 'buy'));

/** Slider handles beside each draggable line. */
const handles = computed(() => {
  const list: {
    role: Role;
    y: number;
    label: string;
    min: number;
    max: number;
    value: number;
    text: string;
  }[] = [];
  for (const role of ['buy', 'sell'] as Role[]) {
    const line = role === 'buy' ? props.recipe.buyLine : props.recipe.sellLine;
    const panel = panelFor(role);
    const param = line && props.recipe.params.find((item) => item.key === line.param);
    if (!line || !panel || !param || !props.series) continue;
    const value = props.values[line.param];
    list.push({
      role,
      y: yOf(panel, value * line.sign) - 13,
      label: role === 'buy' ? props.labels.buyHandle : props.labels.sellHandle,
      min: param.values[0],
      max: param.values[param.values.length - 1],
      value,
      text: props.formatLine(role, value * line.sign),
    });
  }
  return list;
});

/* ---------------------------------------------------------------------------------------------
 * Drawing
 * ------------------------------------------------------------------------------------------- */

/** Draw a series as a min/max envelope per pixel column, so one-hour spikes stay visible. */
function strokeSeries(
  context: CanvasRenderingContext2D,
  panel: Panel,
  values: ArrayLike<number>,
  limit: number,
  transform: (value: number, index: number) => number = (value) => value
): void {
  const columns = Math.max(1, Math.floor(plotWidth.value));
  const n = Math.min(values.length, limit);
  if (n < 2) return;
  context.beginPath();
  let started = false;
  for (let column = 0; column <= columns; column++) {
    const from = Math.floor((column / columns) * (count.value - 1));
    const to = Math.min(n - 1, Math.floor(((column + 1) / columns) * (count.value - 1)));
    if (from > n - 1) break;
    let low = Infinity;
    let high = -Infinity;
    for (let index = from; index <= Math.max(from, to); index++) {
      const value = transform(values[index], index);
      if (!Number.isFinite(value)) continue;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (!Number.isFinite(low)) continue;
    const x = padLeft.value + column;
    if (!started) {
      context.moveTo(x, yOf(panel, low));
      started = true;
    } else context.lineTo(x, yOf(panel, low));
    if (high !== low) context.lineTo(x, yOf(panel, high));
  }
  context.stroke();
}

function drawTriangle(context: CanvasRenderingContext2D, x: number, y: number, up: boolean, size: number): void {
  context.beginPath();
  context.moveTo(x, y + (up ? -size : size));
  context.lineTo(x - size * 0.9, y + (up ? size * 0.6 : -size * 0.6));
  context.lineTo(x + size * 0.9, y + (up ? size * 0.6 : -size * 0.6));
  context.closePath();
}

function draw(time: number): boolean {
  const element = canvas.value;
  const context = element?.getContext('2d');
  const series = props.series;
  if (!element || !context) return false;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const cssWidth = width.value;
  const cssHeight = stageHeight.value;
  if (element.width !== Math.round(cssWidth * ratio) || element.height !== Math.round(cssHeight * ratio)) {
    element.width = Math.round(cssWidth * ratio);
    element.height = Math.round(cssHeight * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  if (!series || !count.value) return false;

  // Progress of the reveal or replay, as a bar limit.
  let limit = count.value;
  let animating = false;
  if (playing.value) {
    const progress = Math.min(1, playFrom + (time - playStart) / PLAY_MS);
    limit = Math.max(2, Math.floor(progress * count.value));
    if (progress >= 1) playing.value = false;
    else animating = true;
  } else if (revealStart && !reduced.value) {
    const progress = Math.min(1, (time - revealStart) / REVEAL_MS);
    limit = Math.max(2, Math.floor((1 - (1 - progress) ** 3) * count.value));
    if (progress < 1) animating = true;
    else revealStart = 0;
  }
  const splitX = xOf(series.split);
  const bottom = cssHeight - PAD.bottom;

  // Halves: a faint wash on the second half, the split line and labels.
  context.fillStyle = cssColor(colors.sell, 0.05);
  context.fillRect(splitX, PAD.top - 6, padLeft.value + plotWidth.value - splitX, bottom - PAD.top + 6);
  context.strokeStyle = cssColor(colors.muted, 0.55);
  context.setLineDash([3, 4]);
  context.beginPath();
  context.moveTo(splitX, PAD.top - 8);
  context.lineTo(splitX, bottom);
  context.stroke();
  context.setLineDash([]);
  context.font = '600 11px system-ui, sans-serif';
  context.fillStyle = cssColor(colors.muted);
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  context.fillText(props.labels.first, padLeft.value + 4, PAD.top - 10);
  context.fillText(props.labels.second, splitX + 6, PAD.top - 10);

  for (const panel of panels.value) {
    // Recessive frame and baseline grid.
    context.strokeStyle = cssColor(colors.muted, 0.14);
    context.lineWidth = 1;
    context.beginPath();
    for (const share of [0, 0.5, 1]) {
      const y = panel.top + panel.height * share;
      context.moveTo(padLeft.value, y);
      context.lineTo(padLeft.value + plotWidth.value, y);
    }
    context.stroke();
    context.fillStyle = cssColor(colors.muted);
    context.font = TICK_FONT;
    context.textAlign = 'right';
    context.fillText(tickLabel(panel, panel.max), padLeft.value - 6, panel.top + 10);
    context.fillText(tickLabel(panel, panel.min), padLeft.value - 6, panel.top + panel.height - 2);
    context.textAlign = 'left';
    context.font = '600 11px system-ui, sans-serif';
    const title =
      panel.key === 'price'
        ? props.labels.price
        : panel.key === 'buy'
          ? props.labels.buyPanel
          : panel.key === 'sell'
            ? props.labels.sellPanel
            : props.labels.equity;
    context.fillText(title, padLeft.value + 6, panel.top + 13);

    // Marks stay inside their panel even when one hour spikes past its range.
    context.save();
    context.beginPath();
    context.rect(padLeft.value, panel.top - 1, plotWidth.value, panel.height + 2);
    context.clip();
    if (panel.key === 'price') {
      context.strokeStyle = cssColor(colors.ink, 0.78);
      context.lineWidth = 1.25;
      strokeSeries(context, panel, series.price, limit);
      // Fill marks: buys under the line, sells over it, popping in as the replay reaches them.
      for (const mark of marks.value) {
        if (mark.index >= limit || mark.index < 0 || mark.index >= count.value) continue;
        const x = xOf(mark.index);
        const y = yOf(panel, series.price[mark.index]) + (mark.side === 'buy' ? 9 : -9);
        const age = playing.value ? Math.min(1, (limit - mark.index) / (count.value * 0.012)) : 1;
        const size = 4.2 * (0.6 + 0.4 * age) * (age < 1 ? 1 + (1 - age) * 0.6 : 1);
        drawTriangle(context, x, y, mark.side === 'buy', size);
        const color = mark.side === 'buy' ? colors.buy : colors.sell;
        context.fillStyle = cssColor(color, props.replayCurrent ? 0.95 : 0.45);
        context.fill();
        context.strokeStyle = cssColor(colors.surface, 0.9);
        context.lineWidth = 1;
        context.stroke();
      }
    } else if (panel.key === 'buy' || panel.key === 'sell') {
      const values = panel.key === 'buy' ? series.buy : series.sell;
      if (values) {
        context.strokeStyle = cssColor(colors.muted, 0.85);
        context.lineWidth = 1;
        strokeSeries(context, panel, values, limit);
      }
      const roles: Role[] = panel.key === 'buy' ? (sellShared.value ? ['buy', 'sell'] : ['buy']) : ['sell'];
      for (const role of roles) {
        const value = lineValue(role);
        if (!Number.isFinite(value)) continue;
        const y = yOf(panel, value);
        const color = role === 'buy' ? colors.buy : colors.sell;
        // Shade the side of the line where the rule triggers.
        const line = role === 'buy' ? props.recipe.buyLine : props.recipe.sellLine;
        const below = line?.indicator(props.values).direction === 'below';
        context.fillStyle = cssColor(color, 0.07);
        if (below) context.fillRect(padLeft.value, y, plotWidth.value, panel.top + panel.height - y);
        else context.fillRect(padLeft.value, panel.top, plotWidth.value, y - panel.top);
        context.strokeStyle = cssColor(color, dragging.value === role ? 1 : 0.85);
        context.lineWidth = dragging.value === role ? 2.4 : 1.8;
        context.beginPath();
        context.moveTo(padLeft.value, y);
        context.lineTo(padLeft.value + plotWidth.value, y);
        context.stroke();
      }
    } else {
      // Bot value against holding the token, each half restarting at zero.
      context.strokeStyle = cssColor(colors.sell, 0.7);
      context.lineWidth = 1.4;
      context.setLineDash([5, 4]);
      strokeSeries(context, panel, series.price, limit, (value, index) => {
        const start = index < series.split ? series.price[0] : series.price[series.split];
        return value / start - 1;
      });
      context.setLineDash([]);
      const path = botPath.value ?? [];
      context.strokeStyle = cssColor(colors.buy, props.replayCurrent ? 1 : 0.5);
      context.lineWidth = 2;
      context.beginPath();
      let previous = -1;
      for (const point of path) {
        if (point.index >= limit) break;
        const x = xOf(point.index);
        const y = yOf(panel, point.value - 1);
        // Break the line where the second half restarts.
        if (previous < 0 || (previous < series.split && point.index >= series.split)) context.moveTo(x, y);
        else context.lineTo(x, y);
        previous = point.index;
      }
      context.stroke();
      const zero = yOf(panel, 0);
      context.strokeStyle = cssColor(colors.muted, 0.35);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(padLeft.value, zero);
      context.lineTo(padLeft.value + plotWidth.value, zero);
      context.stroke();
    }
    context.restore();
  }

  // Month ticks on the shared time axis.
  context.fillStyle = cssColor(colors.muted);
  context.font = '11px system-ui, sans-serif';
  context.textAlign = 'center';
  const start = new Date(series.startAt);
  for (let month = 0; month < 14; month++) {
    const tick = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + month, 1);
    const index = (tick - series.startAt) / HOUR;
    if (index < 0) continue;
    if (index > count.value - 1) break;
    context.fillText(props.formatDate(tick), xOf(index), cssHeight - 6);
  }

  if (playing.value || (animating && revealStart)) {
    const x = xOf(Math.min(limit, count.value - 1));
    context.strokeStyle = cssColor(colors.buy, 0.5);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, PAD.top - 6);
    context.lineTo(x, bottom);
    context.stroke();
  }
  return animating;
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

/** Snap a dragged screen position to the line parameter's grid and emit it when it changes. */
function dragTo(role: Role, y: number): void {
  const line = role === 'buy' ? props.recipe.buyLine : props.recipe.sellLine;
  const panel = panelFor(role);
  const param = line && props.recipe.params.find((item) => item.key === line.param);
  if (!line || !panel || !param) return;
  const value = snapToGrid(param, valueAt(panel, y) * line.sign);
  if (value !== props.values[line.param]) emit('change', { [line.param]: value });
}

function startDrag(role: Role, event: PointerEvent): void {
  dragging.value = role;
  hover.value = null;
  stage.value?.setPointerCapture?.(event.pointerId);
  schedule();
}

function nearLine(x: number, y: number): Role | null {
  if (x < padLeft.value || x > padLeft.value + plotWidth.value) return null;
  for (const handle of handles.value) if (Math.abs(handle.y + 13 - y) <= 7) return handle.role;
  return null;
}

function onStageDown(event: PointerEvent): void {
  const at = localPoint(event);
  const role = nearLine(at.x, at.y);
  if (role) startDrag(role, event);
}

function onStageMove(event: PointerEvent): void {
  const at = localPoint(event);
  if (dragging.value) {
    dragTo(dragging.value, at.y);
    return;
  }
  const series = props.series;
  if (!series || at.x < padLeft.value || at.x > padLeft.value + plotWidth.value) {
    hover.value = null;
    return;
  }
  if (stage.value) stage.value.style.cursor = nearLine(at.x, at.y) ? 'ns-resize' : 'crosshair';
  const index = Math.min(count.value - 1, Math.max(0, indexOf(at.x)));
  const rows = [{ label: props.labels.price, value: props.formatPrice(series.price[index]), tone: 'price' }];
  if (series.buy && Number.isFinite(series.buy[index]))
    rows.push({ label: props.labels.buyPanel, value: props.formatLine('buy', series.buy[index]), tone: 'buy' });
  if (series.sell && Number.isFinite(series.sell[index]))
    rows.push({ label: props.labels.sellPanel, value: props.formatLine('sell', series.sell[index]), tone: 'sell' });
  hover.value = {
    x: Math.min(width.value - 190, Math.max(padLeft.value, at.x + 14)),
    y: Math.max(4, at.y - 70),
    date: props.formatDate(series.startAt + index * HOUR),
    rows,
  };
}

function endDrag(event?: PointerEvent): void {
  if (event) stage.value?.releasePointerCapture?.(event.pointerId);
  dragging.value = null;
  schedule();
}
function onStageUp(event: PointerEvent): void {
  if (dragging.value) endDrag(event);
}
function onStageLeave(): void {
  if (!dragging.value) hover.value = null;
}

/** Arrow keys step through the line's grid; Home and End jump to its ends. */
function onHandleKey(role: Role, event: KeyboardEvent): void {
  const line = role === 'buy' ? props.recipe.buyLine : props.recipe.sellLine;
  const param = line && props.recipe.params.find((item) => item.key === line.param);
  if (!line || !param) return;
  const values = param.values;
  const index = values.indexOf(props.values[line.param]);
  // Up moves the line up the panel: a higher indicator value.
  const up = line.sign > 0 ? 1 : -1;
  let next = index;
  if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = index + up;
  else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = index - up;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = values.length - 1;
  else return;
  event.preventDefault();
  next = Math.min(values.length - 1, Math.max(0, next));
  if (next !== index) emit('change', { [line.param]: values[next] });
}

function togglePlay(): void {
  if (reduced.value) return;
  if (playing.value) {
    playing.value = false;
    schedule();
    return;
  }
  playFrom = 0;
  playStart = performance.now();
  playing.value = true;
  schedule();
}

/* ---------------------------------------------------------------------------------------------
 * Lifecycle
 * ------------------------------------------------------------------------------------------- */

function readColors(): void {
  colors = {
    ink: readProbe(probeInk.value, colors.ink),
    muted: readProbe(probeMuted.value, colors.muted),
    buy: readProbe(probeBuy.value, colors.buy),
    sell: readProbe(probeSell.value, colors.sell),
    surface: readProbe(probeSurface.value, colors.surface),
  };
}
const onMotion = (event: MediaQueryListEvent) => {
  reduced.value = event.matches;
  if (event.matches) playing.value = false;
  schedule();
};
const onVisibility = () => schedule();

onMounted(() => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  reduced.value = motion?.matches ?? false;
  motion?.addEventListener?.('change', onMotion);
  readColors();
  width.value = stage.value?.clientWidth ?? 0;
  revealStart = performance.now();
  schedule();
  if (typeof ResizeObserver !== 'undefined' && stage.value) {
    resize = new ResizeObserver(() => {
      width.value = stage.value?.clientWidth ?? 0;
      schedule();
    });
    resize.observe(stage.value);
  }
  theme = new MutationObserver(() => {
    readColors();
    schedule();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'design-system-theme'] });
  document.addEventListener('visibilitychange', onVisibility);
});

// A new market or recipe draws in from the left; threshold edits redraw in place.
watch(
  () => [props.series?.recipe, props.series?.startAt, props.series?.price.length, props.series?.price[0]],
  () => {
    revealStart = performance.now();
    schedule();
  }
);
watch(
  () => [props.series, props.replay, props.replayCurrent, props.values, props.paused, stageHeight.value, props.busy],
  () => schedule()
);
watch(
  () => props.paused,
  (paused) => {
    if (paused && playing.value) playing.value = false;
  }
);

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  resize?.disconnect();
  theme?.disconnect();
  motion?.removeEventListener?.('change', onMotion);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<style scoped lang="scss">
.signal {
  position: relative;
  margin: 0;
  min-width: 0;
  display: grid;
  gap: 10px;
}
.signal-stage {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  touch-action: pan-y;
  cursor: crosshair;
  background: var(--s-color-base-background, #faf4f8);
  box-shadow:
    inset 3px 3px 9px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    inset -3px -3px 9px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  transition: opacity 200ms ease;
}
.is-busy .signal-stage {
  opacity: 0.8;
}
.signal-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.signal-handle {
  position: absolute;
  top: 0;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 78px;
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 13px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-on-action, #fff);
  cursor: ns-resize;
  touch-action: none;
  box-shadow: 0 4px 12px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.12));
  transition:
    transform 120ms ease,
    box-shadow 160ms ease;
  &:focus-visible {
    outline: 3px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }
  &.is-active {
    box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 22%, transparent);
    transition: none;
  }
}
.signal-handle--buy {
  background: var(--s-color-action-fill, #bf065f);
}
.signal-handle--sell {
  background: color-mix(in srgb, var(--s-color-status-info, #479aef) 55%, var(--s-color-base-content-primary, #2a171f));
}
.signal-tip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: grid;
  gap: 2px;
  min-width: 170px;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-base-content-secondary, #6e6168);
  background: color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 94%, transparent);
  box-shadow: var(--s-shadow-dialog, 0 8px 24px rgba(0, 0, 0, 0.14));
  pointer-events: none;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  time {
    font-weight: 700;
    color: var(--s-color-base-content-primary, #2a171f);
  }
  strong {
    margin-left: 4px;
    color: var(--s-color-base-content-primary, #2a171f);
  }
}
.signal-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
}
.signal-play {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 17px;
  font-weight: 700;
  font-size: 12px;
  color: var(--s-color-base-content-primary, #2a171f);
  background: var(--s-color-utility-surface, #fdf7fb);
  box-shadow: var(--s-shadow-element, 0 2px 6px rgba(0, 0, 0, 0.1));
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }
}
.signal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--s-color-base-content-secondary, #6e6168);
  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}
.signal-key {
  display: inline-block;
  width: 14px;
  height: 2px;
  border-radius: 1px;
}
.signal-key--price {
  background: var(--s-color-base-content-primary, #2a171f);
}
.signal-key--buy {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid var(--s-color-theme-accent, #f8087b);
  background: none;
}
.signal-key--sell {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid
    color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
  background: none;
}
.signal-key--bot {
  height: 3px;
  background: var(--s-color-theme-accent, #f8087b);
}
.signal-key--hold {
  background: repeating-linear-gradient(
    90deg,
    color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b)) 0 4px,
    transparent 4px 7px
  );
}
.signal-summary {
  margin: 0;
  font-size: 12px;
  color: var(--s-color-base-content-tertiary, #796971);
}
.signal-probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
.signal-probe--ink {
  color: var(--s-color-base-content-primary, #2a171f);
}
.signal-probe--muted {
  color: var(--s-color-base-content-tertiary, #796971);
}
.signal-probe--buy {
  color: var(--s-color-theme-accent, #f8087b);
}
.signal-probe--sell {
  color: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
}
.signal-probe--surface {
  color: var(--s-color-utility-surface, #fdf7fb);
}
</style>
