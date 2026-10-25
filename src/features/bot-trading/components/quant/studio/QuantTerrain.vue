<template>
  <figure ref="root" class="terrain" :class="{ 'is-busy': busy, 'is-flat': flat }" data-testid="studio-terrain">
    <div
      ref="stage"
      class="terrain-stage"
      tabindex="0"
      role="application"
      :aria-label="ariaLabel"
      :aria-describedby="`${uid}-help`"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @pointerleave="onPointerLeave"
      @keydown="onKey"
      @focus="onFocus"
      @blur="focusCell = -1"
    >
      <canvas v-if="!flat" ref="canvas" class="terrain-canvas" aria-hidden="true" />
      <canvas v-else ref="flatCanvas" class="terrain-canvas" aria-hidden="true" />
      <span
        v-for="(label, index) in labels"
        :key="label.key"
        :ref="(element) => (labelElements[index] = element as HTMLElement | null)"
        class="terrain-label"
        :class="`terrain-label--${label.kind}`"
        aria-hidden="true"
        >{{ label.text }}</span
      >
      <div
        v-if="tooltipCell"
        class="terrain-tooltip"
        :style="{ transform: `translate(${tooltipAt.x}px, ${tooltipAt.y}px)` }"
        role="tooltip"
        data-testid="studio-terrain-tooltip"
      >
        <strong>{{ xLabel }} {{ formatX(tooltipCell.x) }} · {{ yLabel }} {{ formatY(tooltipCell.y) }}</strong>
        <slot name="tooltip" :x="tooltipCell.x" :y="tooltipCell.y" />
      </div>
    </div>
    <span ref="probeUp" class="terrain-probe terrain-probe--up" aria-hidden="true" />
    <span ref="probeDown" class="terrain-probe terrain-probe--down" aria-hidden="true" />
    <span ref="probeZero" class="terrain-probe terrain-probe--zero" aria-hidden="true" />
    <span ref="probeSurface" class="terrain-probe terrain-probe--surface" aria-hidden="true" />
    <span ref="probeInk" class="terrain-probe terrain-probe--ink" aria-hidden="true" />
    <span ref="probeAccent" class="terrain-probe terrain-probe--accent" aria-hidden="true" />
    <figcaption class="terrain-legend">
      <span class="terrain-legend-item">
        <i class="terrain-legend-column" aria-hidden="true" />{{ heightLabel }}
        <small>{{ heightScaleText }}</small>
      </span>
      <span class="terrain-legend-item">
        {{ colorLabel }}
        <span class="terrain-ramp" aria-hidden="true" />
        <small>{{ colorScaleText }}</small>
      </span>
    </figcaption>
    <p :id="`${uid}-help`" class="terrain-help">{{ help }}</p>
    <p class="terrain-live" aria-live="polite">{{ announcement }}</p>
  </figure>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue';
import {
  TERRAIN_ELEVATION,
  TERRAIN_HEIGHT,
  createTerrainRenderer,
  pickCell,
  projectPoint,
  terrainCamera,
  terrainLayout,
  type TerrainPalette,
  type TerrainRenderer,
  type Vec3,
} from '@/features/bot-trading/quant-terrain-renderer';
import type { StudioLandscape } from '@/features/bot-trading/quant-studio';
import {
  cssColor,
  divergingColor,
  mixOklab,
  niceScale,
  readProbe,
  type DivergingPalette,
  type Rgb,
} from './studio-colors';

defineOptions({ name: 'QuantTerrain' });

/**
 * 3D landscape of one recipe's two main settings. Each column is one setting pair: its height
 * is the first-half result and its colour the second-half result, so tall columns that turn
 * blue are rules that only worked on the hours they were tuned on. Positions and colours come
 * from the fast estimate; the tooltip slot and the result panel show exact numbers.
 */
const props = defineProps<{
  landscape: StudioLandscape | null;
  /** The chosen axis values; their column is outlined. */
  selected: { x: number; y: number } | null;
  xLabel: string;
  yLabel: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  formatPercent: (fraction: number) => string;
  heightLabel: string;
  colorLabel: string;
  help: string;
  ariaLabel: string;
  /** Announced when keyboard focus moves to a column. */
  describe: (x: number, y: number) => string;
  busy?: boolean;
  /** Idle pages draw one static frame instead of animating. */
  paused?: boolean;
}>();
const emit = defineEmits<{
  select: [cell: { x: number; y: number }];
  hover: [cell: { x: number; y: number } | null];
}>();

const uid = useId();
const root = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const flatCanvas = ref<HTMLCanvasElement | null>(null);
const probeUp = ref<HTMLElement | null>(null);
const probeDown = ref<HTMLElement | null>(null);
const probeZero = ref<HTMLElement | null>(null);
const probeSurface = ref<HTMLElement | null>(null);
const probeInk = ref<HTMLElement | null>(null);
const probeAccent = ref<HTMLElement | null>(null);
const labelElements: (HTMLElement | null)[] = [];
/** True when WebGL is unavailable: the same data draws as a flat heatmap. */
const flat = ref(false);
const hoverIndex = ref(-1);
const focusCell = ref(-1);
const tooltipAt = ref({ x: 0, y: 0 });
const announcement = ref('');
const shownHeights = shallowRef(new Float32Array(0));

let renderer: TerrainRenderer | null = null;
let frame = 0;
let width = 0;
let height = 0;
let ratio = 1;
let visible = true;
let reduced = false;
let azimuth = -0.62;
let elevation = 0.62;
let idleSince = 0;
let tweenStart = 0;
let tweenFrom = new Float32Array(0);
let tweenTo = new Float32Array(0);
let tweenDelay = new Float32Array(0);
let colors = new Float32Array(0);
let drag: { x: number; y: number; azimuth: number; elevation: number; moved: boolean; id: number } | null = null;
let resize: ResizeObserver | null = null;
let intersection: IntersectionObserver | null = null;
let theme: MutationObserver | null = null;
let motion: MediaQueryList | null = null;

const TWEEN_MS = 720;
const RIPPLE_MS = 420;
const SWAY = 0.32;
const SWAY_PERIOD_MS = 26_000;
const IDLE_SWAY_MS = 2_500;

let palette: { ramp: DivergingPalette; scene: TerrainPalette } = {
  ramp: { up: [0.67, 0.02, 0.33], zero: [0.8, 0.77, 0.79], down: [0.22, 0.47, 0.8] },
  scene: {
    surface: [0.99, 0.97, 0.98],
    ink: [0.47, 0.41, 0.44],
    accent: [0.97, 0.03, 0.48],
    sky: [1, 0.98, 0.99],
    ground: [0.55, 0.5, 0.58],
  },
};

const nx = computed(() => props.landscape?.xs.length ?? 0);
const ny = computed(() => props.landscape?.ys.length ?? 0);
const heightScale = computed(() => (props.landscape ? niceScale(props.landscape.first) : 0.1));
const colorScale = computed(() => (props.landscape ? niceScale(props.landscape.second) : 0.1));
const heightScaleText = computed(
  () => `${props.formatPercent(-heightScale.value)} … ${props.formatPercent(heightScale.value)}`
);
const colorScaleText = computed(
  () => `${props.formatPercent(-colorScale.value)} … ${props.formatPercent(colorScale.value)}`
);
const selectedIndex = computed(() => {
  const landscape = props.landscape;
  if (!landscape || !props.selected) return -1;
  const i = landscape.xs.indexOf(props.selected.x);
  const j = landscape.ys.indexOf(props.selected.y);
  return i < 0 || j < 0 ? -1 : j * landscape.xs.length + i;
});
const cellAt = (index: number) => {
  const landscape = props.landscape;
  if (!landscape || index < 0 || index >= landscape.xs.length * landscape.ys.length) return null;
  return { x: landscape.xs[index % landscape.xs.length], y: landscape.ys[Math.floor(index / landscape.xs.length)] };
};
const tooltipCell = computed(() => cellAt(hoverIndex.value >= 0 ? hoverIndex.value : focusCell.value));

/** Axis tick labels with their world anchor; screen positions are updated every frame. */
const labels = computed(() => {
  const landscape = props.landscape;
  if (!landscape) return [];
  const layout = terrainLayout(landscape.xs.length, landscape.ys.length);
  const every = (count: number) => Math.max(1, Math.ceil(count / 7));
  const list: { key: string; kind: 'x' | 'y' | 'title'; text: string; at: Vec3 }[] = [];
  landscape.xs.forEach((value, i) => {
    if (i % every(landscape.xs.length) === 0 || i === landscape.xs.length - 1)
      list.push({
        key: `x${i}`,
        kind: 'x',
        text: props.formatX(value),
        at: [layout.x(i), 0, layout.halfDepth + layout.cell * 0.9],
      });
  });
  landscape.ys.forEach((value, j) => {
    if (j % every(landscape.ys.length) === 0 || j === landscape.ys.length - 1)
      list.push({
        key: `y${j}`,
        kind: 'y',
        text: props.formatY(value),
        at: [-layout.halfWidth - layout.cell * 0.9, 0, layout.z(j)],
      });
  });
  list.push({ key: 'xt', kind: 'title', text: props.xLabel, at: [0, 0, layout.halfDepth + layout.cell * 2] });
  list.push({ key: 'yt', kind: 'title', text: props.yLabel, at: [-layout.halfWidth - layout.cell * 2.2, 0, 0] });
  return list;
});

function readColors(): void {
  const up = readProbe(probeUp.value, palette.ramp.up);
  const down = readProbe(probeDown.value, palette.ramp.down);
  const zero = readProbe(probeZero.value, palette.ramp.zero);
  const surface = readProbe(probeSurface.value, palette.scene.surface);
  const ink = readProbe(probeInk.value, palette.scene.ink);
  const accent = readProbe(probeAccent.value, palette.scene.accent);
  palette = {
    ramp: { up, down, zero },
    scene: { surface, ink, accent, sky: mixOklab(surface, [1, 1, 1], 0.4), ground: mixOklab(ink, surface, 0.35) },
  };
  updateColors();
}

function updateColors(): void {
  const landscape = props.landscape;
  if (!landscape) return;
  colors = new Float32Array(landscape.second.length * 3);
  landscape.second.forEach((value, index) =>
    colors.set(divergingColor(value, colorScale.value, palette.ramp), index * 3)
  );
}

/** Start a height tween; new grids grow as a ripple outward from the chosen column. */
function retarget(fresh: boolean): void {
  const landscape = props.landscape;
  if (!landscape) return;
  const count = landscape.first.length;
  const target = Float32Array.from(landscape.first, (value) => Math.max(-1, Math.min(1, value / heightScale.value)));
  const from = new Float32Array(count);
  if (!fresh && shownHeights.value.length === count) from.set(shownHeights.value);
  const delay = new Float32Array(count);
  if (fresh) {
    const center = selectedIndex.value >= 0 ? selectedIndex.value : Math.floor(count / 2);
    const cx = center % landscape.xs.length;
    const cy = Math.floor(center / landscape.xs.length);
    const reach = Math.hypot(landscape.xs.length, landscape.ys.length) || 1;
    for (let index = 0; index < count; index++) {
      const distance = Math.hypot((index % landscape.xs.length) - cx, Math.floor(index / landscape.xs.length) - cy);
      delay[index] = (distance / reach) * RIPPLE_MS;
    }
  }
  tweenFrom = from;
  tweenTo = target;
  tweenDelay = delay;
  tweenStart = performance.now();
  if (reduced) {
    shownHeights.value = target;
    tweenStart = 0;
  }
  updateColors();
  schedule();
}

const ease = (t: number) => 1 - (1 - t) ** 3;

/** Advance the tween; returns true while columns are still moving. */
function stepTween(time: number): boolean {
  if (!tweenStart) return false;
  const count = tweenTo.length;
  const next = new Float32Array(count);
  let moving = false;
  for (let index = 0; index < count; index++) {
    const t = Math.min(1, Math.max(0, (time - tweenStart - tweenDelay[index]) / TWEEN_MS));
    if (t < 1) moving = true;
    next[index] = tweenFrom[index] + (tweenTo[index] - tweenFrom[index]) * ease(t);
  }
  shownHeights.value = next;
  if (!moving) tweenStart = 0;
  return moving;
}

function viewAzimuth(time: number): number {
  if (reduced || props.paused || drag || time - idleSince < IDLE_SWAY_MS) return azimuth;
  return azimuth + Math.sin(((time - idleSince - IDLE_SWAY_MS) / SWAY_PERIOD_MS) * Math.PI * 2) * SWAY;
}

function placeLabels(view: number): void {
  if (flat.value) return placeFlatLabels();
  const camera = terrainCamera(view, elevation, width / Math.max(1, height));
  labels.value.forEach((label, index) => {
    const element = labelElements[index];
    const point = projectPoint(camera, label.at, width, height);
    if (!element) return;
    if (!point) {
      element.style.opacity = '0';
      return;
    }
    // Keep each label fully inside the stage, even when its anchor projects near an edge.
    const half = element.offsetWidth / 2;
    const x = Math.min(width - 4 - half, Math.max(4 + half, point.x));
    const y = Math.min(height - 10, Math.max(10, point.y));
    element.style.opacity = '1';
    element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });
  const cell = hoverIndex.value >= 0 ? hoverIndex.value : focusCell.value;
  if (cell >= 0 && nx.value) {
    const layout = terrainLayout(nx.value, ny.value);
    const top = Math.max(0, (shownHeights.value[cell] ?? 0) * TERRAIN_HEIGHT);
    const point = projectPoint(
      camera,
      [layout.x(cell % nx.value), top, layout.z(Math.floor(cell / nx.value))],
      width,
      height
    );
    if (point) tooltipAt.value = { x: Math.min(width - 12, Math.max(12, point.x)), y: Math.max(8, point.y - 14) };
  }
}

function draw(time: number): boolean {
  const moving = stepTween(time);
  const view = viewAzimuth(time);
  const pulse = reduced || props.paused ? 0.5 : (Math.sin(time / 380) + 1) / 2;
  if (flat.value) drawFlat();
  else if (renderer && nx.value)
    renderer.draw({
      width,
      height,
      ratio,
      nx: nx.value,
      ny: ny.value,
      heights: shownHeights.value,
      colors,
      selected: selectedIndex.value,
      hovered: hoverIndex.value >= 0 ? hoverIndex.value : focusCell.value,
      azimuth: view,
      elevation,
      pulse,
      palette: palette.scene,
    });
  placeLabels(view);
  return (
    moving || (!reduced && !props.paused && (!!drag || time - idleSince >= IDLE_SWAY_MS || selectedIndex.value >= 0))
  );
}

function loop(time: number): void {
  frame = 0;
  const animate = draw(time);
  if (animate && visible && !props.paused && !reduced && document.visibilityState === 'visible')
    frame = requestAnimationFrame(loop);
}
function schedule(): void {
  if (!frame && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------------------------------------
 * Flat fallback: a heatmap with the first half as a dot (filled for gains, ringed for losses)
 * ------------------------------------------------------------------------------------------- */

function flatGeometry() {
  const padLeft = 64;
  const padBottom = 40;
  const cellWidth = (width - padLeft - 12) / Math.max(1, nx.value);
  const cellHeight = (height - padBottom - 12) / Math.max(1, ny.value);
  return { padLeft, padBottom, cellWidth, cellHeight };
}

function drawFlat(): void {
  const element = flatCanvas.value;
  const context = element?.getContext('2d');
  const landscape = props.landscape;
  if (!element || !context || !landscape) return;
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (element.width !== pixelWidth || element.height !== pixelHeight) {
    element.width = pixelWidth;
    element.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  const { padLeft, cellWidth, cellHeight } = flatGeometry();
  const ink = palette.scene.ink;
  for (let index = 0; index < landscape.first.length; index++) {
    const i = index % nx.value;
    const j = Math.floor(index / nx.value);
    const x = padLeft + i * cellWidth;
    const y = 12 + (ny.value - 1 - j) * cellHeight;
    context.fillStyle = cssColor([colors[index * 3], colors[index * 3 + 1], colors[index * 3 + 2]] as Rgb);
    context.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
    const share = shownHeights.value[index] ?? 0;
    const radius = Math.max(1.5, (Math.min(cellWidth, cellHeight) / 2 - 3) * Math.sqrt(Math.abs(share)));
    context.beginPath();
    context.arc(x + cellWidth / 2, y + cellHeight / 2, radius, 0, Math.PI * 2);
    if (share >= 0) {
      context.fillStyle = cssColor(ink, 0.8);
      context.fill();
    } else {
      context.strokeStyle = cssColor(ink, 0.8);
      context.lineWidth = 1.5;
      context.stroke();
    }
    if (index === selectedIndex.value || index === hoverIndex.value || index === focusCell.value) {
      context.strokeStyle = cssColor(palette.scene.accent, index === selectedIndex.value ? 1 : 0.6);
      context.lineWidth = 2;
      context.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
    }
  }
}

function placeFlatLabels(): void {
  const { padLeft, cellWidth, cellHeight } = flatGeometry();
  const landscape = props.landscape;
  if (!landscape) return;
  labels.value.forEach((label, index) => {
    const element = labelElements[index];
    if (!element) return;
    let x = 0;
    let y = 0;
    if (label.kind === 'x') {
      x = padLeft + (Number(label.key.slice(1)) + 0.5) * cellWidth;
      y = height - 26;
    } else if (label.kind === 'y') {
      x = padLeft - 30;
      y = 12 + (ny.value - 1 - Number(label.key.slice(1)) + 0.5) * cellHeight;
    } else if (label.key === 'xt') {
      x = padLeft + (nx.value * cellWidth) / 2;
      y = height - 8;
    } else {
      x = 14;
      y = 6;
    }
    element.style.opacity = '1';
    element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });
  const cell = hoverIndex.value >= 0 ? hoverIndex.value : focusCell.value;
  if (cell >= 0)
    tooltipAt.value = {
      x: padLeft + ((cell % nx.value) + 0.5) * cellWidth,
      y: 12 + (ny.value - 1 - Math.floor(cell / nx.value)) * cellHeight,
    };
}

function flatPick(px: number, py: number): number {
  const { padLeft, cellWidth, cellHeight } = flatGeometry();
  const i = Math.floor((px - padLeft) / cellWidth);
  const j = ny.value - 1 - Math.floor((py - 12) / cellHeight);
  return i < 0 || j < 0 || i >= nx.value || j >= ny.value ? -1 : j * nx.value + i;
}

/* ---------------------------------------------------------------------------------------------
 * Input
 * ------------------------------------------------------------------------------------------- */

function localPoint(event: PointerEvent) {
  const rect = stage.value?.getBoundingClientRect();
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
}
function pickAt(x: number, y: number): number {
  if (!nx.value) return -1;
  if (flat.value) return flatPick(x, y);
  const camera = terrainCamera(viewAzimuth(performance.now()), elevation, width / Math.max(1, height));
  return pickCell(camera, terrainLayout(nx.value, ny.value), Array.from(shownHeights.value), x, y, width, height);
}
function setHover(index: number): void {
  if (hoverIndex.value === index) return;
  hoverIndex.value = index;
  emit('hover', cellAt(index));
  schedule();
}
function wake(): void {
  // Freeze the sway where it is so the scene does not jump when the user takes over.
  azimuth = viewAzimuth(performance.now());
  idleSince = performance.now();
}

function onPointerDown(event: PointerEvent): void {
  wake();
  const at = localPoint(event);
  drag = { x: at.x, y: at.y, azimuth, elevation, moved: false, id: event.pointerId };
  stage.value?.setPointerCapture?.(event.pointerId);
}
function onPointerMove(event: PointerEvent): void {
  const at = localPoint(event);
  if (drag && drag.id === event.pointerId) {
    const dx = at.x - drag.x;
    const dy = at.y - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved && !flat.value) {
      azimuth = drag.azimuth - dx * 0.0085;
      elevation = Math.min(TERRAIN_ELEVATION.max, Math.max(TERRAIN_ELEVATION.min, drag.elevation + dy * 0.0065));
      idleSince = performance.now();
      setHover(-1);
      schedule();
      return;
    }
  }
  setHover(pickAt(at.x, at.y));
}
function onPointerUp(event: PointerEvent): void {
  if (!drag || drag.id !== event.pointerId) return;
  const at = localPoint(event);
  const clicked = !drag.moved;
  drag = null;
  stage.value?.releasePointerCapture?.(event.pointerId);
  wake();
  if (clicked) {
    const cell = cellAt(pickAt(at.x, at.y));
    if (cell) emit('select', cell);
  }
  schedule();
}
function onPointerCancel(): void {
  drag = null;
  wake();
}
function onPointerLeave(): void {
  if (!drag) setHover(-1);
}
function onFocus(): void {
  if (focusCell.value < 0) moveFocus(selectedIndex.value >= 0 ? selectedIndex.value : 0);
}
function moveFocus(index: number): void {
  if (!nx.value) return;
  focusCell.value = Math.min(nx.value * ny.value - 1, Math.max(0, index));
  const cell = cellAt(focusCell.value);
  if (cell) announcement.value = props.describe(cell.x, cell.y);
  emit('hover', cell);
  schedule();
}
function onKey(event: KeyboardEvent): void {
  if (!nx.value) return;
  const current = focusCell.value >= 0 ? focusCell.value : Math.max(0, selectedIndex.value);
  const i = current % nx.value;
  const j = Math.floor(current / nx.value);
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, 1],
    ArrowDown: [0, -1],
  };
  if (moves[event.key]) {
    event.preventDefault();
    const [di, dj] = moves[event.key];
    moveFocus(Math.min(ny.value - 1, Math.max(0, j + dj)) * nx.value + Math.min(nx.value - 1, Math.max(0, i + di)));
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const cell = cellAt(current);
    if (cell) emit('select', cell);
  } else if (event.key === 'Escape') {
    focusCell.value = -1;
    emit('hover', null);
  }
}

/* ---------------------------------------------------------------------------------------------
 * Lifecycle
 * ------------------------------------------------------------------------------------------- */

function size(): void {
  const element = stage.value;
  if (!element) return;
  width = element.clientWidth;
  height = element.clientHeight;
  ratio = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  schedule();
}
const onMotion = (event: MediaQueryListEvent) => {
  reduced = event.matches;
  schedule();
};
const onVisibility = () => schedule();

function createRenderer(): void {
  renderer?.dispose();
  renderer = null;
  if (flat.value || !canvas.value) return;
  renderer = createTerrainRenderer(canvas.value, () => {
    renderer = null;
    flat.value = true;
    void nextTick(schedule);
  });
  if (!renderer) flat.value = true;
}

onMounted(() => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  reduced = motion?.matches ?? false;
  motion?.addEventListener?.('change', onMotion);
  idleSince = performance.now();
  readColors();
  size();
  createRenderer();
  retarget(true);
  if (typeof ResizeObserver !== 'undefined' && stage.value) {
    resize = new ResizeObserver(size);
    resize.observe(stage.value);
  }
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) schedule();
    });
    intersection.observe(root.value);
  }
  theme = new MutationObserver(() => {
    readColors();
    schedule();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'design-system-theme'] });
  document.addEventListener('visibilitychange', onVisibility);
});

watch(
  () => props.landscape,
  (next, previous) => {
    const fresh =
      !previous ||
      !next ||
      previous.xs.length !== next.xs.length ||
      previous.ys.length !== next.ys.length ||
      previous.recipe !== next.recipe;
    if (focusCell.value >= nx.value * ny.value) focusCell.value = -1;
    retarget(fresh);
  }
);
watch(flat, () => void nextTick(schedule));
watch(
  () => [selectedIndex.value, props.paused],
  () => {
    if (!props.paused) wake();
    schedule();
  }
);

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  renderer?.dispose();
  renderer = null;
  resize?.disconnect();
  intersection?.disconnect();
  theme?.disconnect();
  motion?.removeEventListener?.('change', onMotion);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<style scoped lang="scss">
.terrain {
  position: relative;
  margin: 0;
  min-width: 0;
  display: grid;
  gap: 10px;
}
.terrain-stage {
  position: relative;
  height: clamp(260px, 42vw, 400px);
  border-radius: 22px;
  overflow: hidden;
  touch-action: pan-y;
  cursor: grab;
  outline: none;
  background:
    radial-gradient(
      80% 70% at 50% 35%,
      color-mix(in srgb, var(--s-color-theme-accent, #f8087b) 7%, transparent),
      transparent 70%
    ),
    var(--s-color-base-background, #faf4f8);
  box-shadow:
    inset 3px 3px 9px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    inset -3px -3px 9px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  transition: opacity 200ms ease;
  &:active {
    cursor: grabbing;
  }
  &:focus-visible {
    box-shadow:
      inset 3px 3px 9px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
      0 0 0 3px var(--s-color-focus-ring, #ab0555);
  }
}
.is-flat .terrain-stage {
  cursor: pointer;
}
.is-busy .terrain-stage {
  opacity: 0.72;
}
.terrain-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.terrain-label {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-base-content-secondary, #6e6168);
  white-space: nowrap;
  pointer-events: none;
  will-change: transform;
}
.terrain-label--title {
  font-weight: 700;
  color: var(--s-color-base-content-primary, #2a171f);
}
.terrain-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: grid;
  gap: 2px;
  min-width: 160px;
  max-width: 240px;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--s-color-base-content-primary, #2a171f);
  background: color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 94%, transparent);
  box-shadow: var(--s-shadow-dialog, 0 8px 24px rgba(0, 0, 0, 0.14));
  pointer-events: none;
  transform-origin: 50% 100%;
  translate: -50% -100%;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  strong {
    font-weight: 700;
  }
}
.terrain-probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
.terrain-probe--up {
  color: var(--s-color-action-text, #ab0555);
}
.terrain-probe--down {
  color: color-mix(in srgb, var(--s-color-status-info, #479aef) 82%, var(--s-color-base-content-primary, #2a171f));
}
.terrain-probe--zero {
  color: color-mix(in srgb, var(--s-color-base-content-tertiary, #796971) 38%, var(--s-color-utility-surface, #fdf7fb));
}
.terrain-probe--surface {
  color: var(--s-color-utility-surface, #fdf7fb);
}
.terrain-probe--ink {
  color: var(--s-color-base-content-tertiary, #796971);
}
.terrain-probe--accent {
  color: var(--s-color-theme-accent, #f8087b);
}
.terrain-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  align-items: center;
  font-size: 12px;
  color: var(--s-color-base-content-secondary, #6e6168);
  small {
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
    color: var(--s-color-base-content-tertiary, #796971);
  }
}
.terrain-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.terrain-legend-column {
  width: 8px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--s-color-base-content-tertiary, #796971), transparent);
}
.terrain-ramp {
  width: 84px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--s-color-status-info, #479aef) 82%, var(--s-color-base-content-primary, #2a171f)),
    color-mix(in srgb, var(--s-color-base-content-tertiary, #796971) 38%, var(--s-color-utility-surface, #fdf7fb)),
    var(--s-color-action-text, #ab0555)
  );
}
.terrain-help {
  margin: 0;
  font-size: 12px;
  color: var(--s-color-base-content-tertiary, #796971);
}
.terrain-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
