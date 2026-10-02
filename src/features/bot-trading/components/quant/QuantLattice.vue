<template>
  <figure ref="root" class="lattice" data-testid="quant-lattice">
    <canvas ref="canvas" aria-hidden="true" />
    <span ref="probePink" class="lattice-probe lattice-probe--pink" aria-hidden="true" />
    <span ref="probeViolet" class="lattice-probe lattice-probe--violet" aria-hidden="true" />
    <span ref="probeMuted" class="lattice-probe lattice-probe--muted" aria-hidden="true" />
    <ol class="lattice-bins" :style="{ maxWidth: `${binsWidth}px` }">
      <li v-for="(bin, index) in BINS" :key="bin.label" :class="{ loss: index < 4 }">
        <strong>{{ counts[index] }}</strong>
        <span>{{ bin.label }}</span>
      </li>
    </ol>
  </figure>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { QuantFill } from '@/features/bot-trading/quant-loop';

defineOptions({ name: 'QuantLattice' });

/**
 * Galton-board view of realized out-of-sample sells. Each ball is one sell lot and lands
 * in the bin of its exact after-fee result; peg bounces are illustrative and derived from
 * the bin, so the motion never changes or invents an outcome.
 */
const props = defineProps<{
  fills: QuantFill[];
  /** While research runs, a decorative light band scans the empty board. */
  scanning?: boolean;
}>();

const BINS = [
  { max: -20, label: '≤ −20%' },
  { max: -10, label: '−20…−10' },
  { max: -5, label: '−10…−5' },
  { max: 0, label: '−5…0' },
  { max: 5, label: '0…5' },
  { max: 10, label: '5…10' },
  { max: 20, label: '10…20' },
  { max: Infinity, label: '≥ 20%' },
];
const ROWS = BINS.length - 1;

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const probePink = ref<HTMLElement | null>(null);
const probeViolet = ref<HTMLElement | null>(null);
const probeMuted = ref<HTMLElement | null>(null);

const outcomes = computed(() =>
  props.fills
    .filter((fill) => fill.side === 'sell')
    .map((fill, index) => {
      const value = Number(fill.pnlPercent);
      const bin = BINS.findIndex((item) => value < item.max || item.max === Infinity);
      return { bin: bin < 0 ? BINS.length - 1 : bin, key: `${fill.timestamp}-${index}` };
    })
);
const counts = computed(() => BINS.map((_bin, index) => outcomes.value.filter((item) => item.bin === index).length));
/** Bin labels share the canvas bin spacing so they sit under their columns. */
const binsWidth = ref(368);

let width = 0;
const height = 250;
let frame = 0;
let started = 0;
let reduced = false;
let visible = false;
let colors = { pink: 'rgb(248, 8, 123)', violet: 'rgb(159, 91, 208)', muted: 'rgb(121, 105, 113)' };
let resize: ResizeObserver | null = null;
let intersection: IntersectionObserver | null = null;
let motionQuery: MediaQueryList | null = null;
const onMotion = (event: MediaQueryListEvent) => {
  reduced = event.matches;
  restart();
};

function hash(text: string, salt: number): number {
  let value = 2166136261 ^ salt;
  for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return (value >>> 0) / 4294967296;
}

/** Choose exactly `bin` right bounces out of ROWS pegs, ordered by a stable hash. */
function bounces(key: string, bin: number): number[] {
  const order = Array.from({ length: ROWS }, (_value, index) => ({ index, rank: hash(key, index) })).sort(
    (a, b) => a.rank - b.rank
  );
  const rights = new Set(order.slice(0, bin).map((item) => item.index));
  return Array.from({ length: ROWS }, (_value, index) => (rights.has(index) ? 1 : 0));
}

function geometry() {
  const top = 22;
  const bottom = height - 64;
  const spacing = Math.min(46, (width - 40) / BINS.length);
  return { top, bottom, spacing, center: width / 2, rowGap: (bottom - top) / ROWS };
}

function rgba(color: string, alpha: number): string {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return color;
  const [r, g, b] = match[1].split(/[\s,/]+/).filter(Boolean);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function draw(time: number): void {
  const context = canvas.value?.getContext('2d');
  if (!context || !width) return;
  const { top, bottom, spacing, center, rowGap } = geometry();
  context.clearRect(0, 0, width, height);
  const scanning = !!props.scanning && !outcomes.value.length && !reduced;
  const band = scanning ? top - 20 + (((time - started) / 1600) % 1) * (bottom - top + 60) : -1e9;
  // Pegs; while scanning, pegs near the moving band light up.
  for (let row = 0; row < ROWS; row++) {
    for (let peg = 0; peg <= row; peg++) {
      const x = center + (peg - row / 2) * spacing;
      const y = top + row * rowGap;
      const glow = Math.max(0, 1 - Math.abs(y - band) / 26);
      context.beginPath();
      context.arc(x, y, 2.4 + glow * 2.6, 0, Math.PI * 2);
      context.fillStyle = glow > 0 ? rgba(colors.pink, 0.45 + glow * 0.5) : rgba(colors.muted, 0.45);
      if (glow > 0) {
        context.shadowColor = rgba(colors.pink, 0.8);
        context.shadowBlur = 12 * glow;
      }
      context.fill();
      context.shadowBlur = 0;
    }
  }
  // Bin walls.
  for (let edge = 0; edge <= BINS.length; edge++) {
    const x = center + (edge - BINS.length / 2) * spacing;
    context.beginPath();
    context.moveTo(x, bottom + 8);
    context.lineTo(x, height - 22);
    context.strokeStyle = rgba(colors.muted, 0.25);
    context.stroke();
  }
  const elapsed = reduced ? Infinity : time - started;
  const stacks = BINS.map(() => 0);
  const radius = Math.max(2.4, Math.min(5, spacing / 9));
  outcomes.value.forEach((item, index) => {
    const color = item.bin < 4 ? colors.violet : colors.pink;
    const local = (elapsed - index * 140) / 1100;
    const binX = center + (item.bin - (BINS.length - 1) / 2) * spacing;
    if (local >= 1) {
      // Stack settled balls inside their bin, five per layer.
      const slot = stacks[item.bin]++;
      const column = slot % 5;
      const layer = Math.floor(slot / 5);
      const x = binX + (column - 2) * radius * 1.7;
      const y = height - 22 - radius - layer * radius * 1.8;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = rgba(color, 0.9);
      context.fill();
      return;
    }
    if (local <= 0) return;
    // Interpolate along the bounce path for balls still falling.
    const path = bounces(item.key, item.bin);
    const progress = local * (ROWS + 1);
    const row = Math.min(ROWS, Math.floor(progress));
    const fraction = progress - row;
    let offset = 0;
    for (let step = 0; step < row && step < ROWS; step++) offset += path[step];
    const fromX = center + (offset - row / 2) * spacing;
    const toX = row < ROWS ? center + (offset + path[row] - (row + 1) / 2) * spacing : binX;
    const x = fromX + (toX - fromX) * fraction;
    const y = top - 12 + (row + fraction) * rowGap - Math.sin(fraction * Math.PI) * 6;
    context.beginPath();
    context.arc(x, Math.min(y, bottom + 4), radius, 0, Math.PI * 2);
    context.shadowColor = rgba(color, 0.6);
    context.shadowBlur = 10;
    context.fillStyle = color;
    context.fill();
    context.shadowBlur = 0;
  });
  const done = !scanning && (reduced || elapsed > outcomes.value.length * 140 + 1200);
  if (!done && visible) frame = requestAnimationFrame(draw);
  else frame = 0;
}

function readColors(): void {
  const read = (element: HTMLElement | null, fallback: string) =>
    (element && getComputedStyle(element).color) || fallback;
  colors = {
    pink: read(probePink.value, colors.pink),
    violet: read(probeViolet.value, colors.violet),
    muted: read(probeMuted.value, colors.muted),
  };
}

function size(): void {
  const element = canvas.value;
  if (!element || !root.value) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  width = root.value.clientWidth;
  element.width = Math.round(width * ratio);
  element.height = Math.round(height * ratio);
  element.style.height = `${height}px`;
  element.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
  binsWidth.value = Math.round(geometry().spacing * BINS.length);
}

function restart(): void {
  if (frame) cancelAnimationFrame(frame);
  started = performance.now();
  frame = requestAnimationFrame(draw);
}

onMounted(() => {
  motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  reduced = motionQuery?.matches ?? false;
  motionQuery?.addEventListener?.('change', onMotion);
  readColors();
  size();
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resize = new ResizeObserver(() => {
      size();
      if (!frame) frame = requestAnimationFrame(draw);
    });
    resize.observe(root.value);
  }
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    intersection = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry?.isIntersecting ?? true;
      // Start the drop the first time the board scrolls into view.
      if (visible && !was) restart();
    });
    intersection.observe(root.value);
  } else {
    visible = true;
    restart();
  }
});
watch(
  () => [outcomes.value.map((item) => item.key).join(), props.scanning],
  () => {
    if (visible || reduced) restart();
  }
);
onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  resize?.disconnect();
  intersection?.disconnect();
  motionQuery?.removeEventListener?.('change', onMotion);
});
</script>

<style scoped lang="scss">
.lattice {
  position: relative;
  margin: 0;
  min-width: 0;
  canvas {
    display: block;
    width: 100%;
  }
}
.lattice-probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
.lattice-probe--pink {
  color: var(--s-color-theme-accent, #f8087b);
}
.lattice-probe--violet {
  color: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
}
.lattice-probe--muted {
  color: var(--s-color-base-content-tertiary, #796971);
}
.lattice-bins {
  display: grid;
  grid-template-columns: repeat(8, #{'minmax(0, 1fr)'});
  margin: -18px auto 0;
  padding: 0;
  list-style: none;
  text-align: center;
  li {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  strong {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--s-color-action-text, #ab0555);
  }
  .loss strong {
    color: color-mix(in srgb, var(--s-color-status-info, #479aef) 55%, var(--s-color-base-content-primary, #2a171f));
  }
  span {
    font-size: 9px;
    line-height: 1.2;
    color: var(--s-color-base-content-secondary, #6e6168);
    overflow-wrap: anywhere;
  }
}
</style>
