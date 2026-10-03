<template>
  <div ref="root" class="glass-art" :class="{ active }" :data-renderer="renderer" aria-hidden="true">
    <canvas
      ref="canvas"
      class="glass-art-canvas"
      :class="{ 'is-live': renderer === 'webgl' }"
      @pointermove="onPointer"
      @pointerleave="onPointerLeave"
    />
    <span v-if="renderer === 'static'" class="glass-art-fallback">
      <i
        v-for="(coin, index) in coins"
        :key="coin.symbol"
        :class="`glass-art-drop glass-art-drop--${index + 1}`"
        :style="{ '--glass-art-coin': coin.image }"
      />
    </span>
    <span ref="probeSurface" class="glass-art-probe glass-art-probe--surface" />
    <span ref="probePink" class="glass-art-probe glass-art-probe--pink" />
    <span ref="probeViolet" class="glass-art-probe glass-art-probe--violet" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { canAnimateWater, createWaterSimulation, WATER_VIEW } from '@/features/bot-trading/quant-water';
import { buildCoinAtlas, WATER_COINS } from '@/features/bot-trading/quant-water-coins';
import { createWaterRenderer, type WaterRenderer } from '@/features/bot-trading/quant-water-renderer';

defineOptions({ name: 'QuantGlassArt' });

/**
 * Decorative ray-traced water bubbles (WebGL): three large ones for research, test and trade,
 * each with a coin logo (PSWAP, XOR, ETH) printed around it in 3D. Swiping across a bubble
 * pushes it and spins its coin. `active` makes the water livelier while research runs;
 * `paused` (calm mode) stops the frame loop.
 * The art also stops on its own after a minute without input, off-screen or in a hidden tab,
 * draws one still frame for reduced motion or constrained devices, and shows CSS drops when
 * WebGL is unavailable. It never receives prices, balances or research data.
 */
const props = defineProps<{ active?: boolean; paused?: boolean }>();

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const probeSurface = ref<HTMLElement | null>(null);
const probePink = ref<HTMLElement | null>(null);
const probeViolet = ref<HTMLElement | null>(null);
/** The CSS fallback shows the same bundled logos, inlined as data URLs. */
const coins = WATER_COINS.map((coin) => ({
  symbol: coin.symbol,
  image: `url("data:image/svg+xml,${encodeURIComponent(coin.svg)}")`,
}));
/** `pending` until the renderer is tried after first paint, then `webgl` or `static`. */
const renderer = ref<'pending' | 'webgl' | 'static'>('pending');

/** Thirty frames a second is plenty for slow water and halves the GPU work of sixty. */
const FRAME_MS = 1000 / 30;
const IDLE_MS = 60_000;
/** Still frames show the bubbles mid-wobble rather than as perfect spheres. */
const STILL_SECONDS = 3.2;
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

const simulation = createWaterSimulation();
let gpu: WaterRenderer | null = null;
let frame = 0;
let lastTick = 0;
let lastDraw = 0;
let lastInput = 0;
let visible = true;
let animate = false;
let disposed = false;
let pointer: { x: number; y: number; time: number } | null = null;
let cancelInit: (() => void) | undefined;
let motion: MediaQueryList | null = null;
let resize: ResizeObserver | null = null;
let intersection: IntersectionObserver | null = null;
let theme: MutationObserver | null = null;

function readPolicy(): boolean {
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return canAnimateWater({
    reducedMotion: motion?.matches ?? false,
    saveData: device.connection?.saveData,
    hardwareConcurrency: device.hardwareConcurrency,
    deviceMemory: device.deviceMemory,
  });
}

function running(now: number): boolean {
  return animate && !props.paused && visible && !document.hidden && now - lastInput < IDLE_MS;
}

function readPalette(): void {
  const color = (element: HTMLElement | null) => (element ? getComputedStyle(element).color : '');
  gpu?.setPalette({
    surface: color(probeSurface.value),
    pink: color(probePink.value),
    violet: color(probeViolet.value),
  });
}

function size(): void {
  if (gpu && root.value) gpu.resize(root.value.clientWidth, root.value.clientHeight, window.devicePixelRatio || 1);
}

/** Draw the current state once; resizing clears the canvas, so stills need a redraw. */
function drawOnce(): void {
  if (gpu && !gpu.draw(simulation.frame())) fail();
}

function loop(now: number): void {
  frame = 0;
  if (!gpu || !running(now)) return;
  if (now - lastDraw >= FRAME_MS - 1) {
    simulation.step(lastTick ? (now - lastTick) / 1000 : 0);
    lastTick = now;
    lastDraw = now;
    if (!gpu.draw(simulation.frame())) {
      fail();
      return;
    }
  }
  frame = requestAnimationFrame(loop);
}

function schedule(): void {
  if (frame || !gpu || !running(performance.now())) return;
  // Resume from the present: time spent paused or hidden does not replay as a jump.
  lastTick = 0;
  lastDraw = 0;
  frame = requestAnimationFrame(loop);
}

function stop(): void {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/** WebGL failed or its context was lost: show the CSS drops and never retry on this mount. */
function fail(): void {
  stop();
  gpu?.dispose();
  gpu = null;
  renderer.value = 'static';
}

function wake(): void {
  lastInput = performance.now();
  schedule();
}

function onMotion(): void {
  animate = readPolicy();
  if (animate) schedule();
  else {
    stop();
    drawOnce();
  }
}

function onVisibility(): void {
  if (document.hidden) stop();
  else schedule();
}

/** Pointer moves push nearby bubbles; coordinates map onto the backdrop plane, y up. */
function onPointer(event: PointerEvent): void {
  const element = canvas.value;
  if (!element || !gpu) return;
  const box = element.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const previous = pointer;
  const at = {
    x: (((event.clientX - box.left) / box.width) * 2 - 1) * WATER_VIEW[0],
    y: (1 - ((event.clientY - box.top) / box.height) * 2) * WATER_VIEW[1],
    time: event.timeStamp,
  };
  pointer = at;
  if (!previous || !animate || props.paused) return;
  const seconds = Math.max(at.time - previous.time, 8) / 1000;
  if (simulation.poke(at.x, at.y, (at.x - previous.x) / seconds, (at.y - previous.y) / seconds)) wake();
}

function onPointerLeave(): void {
  pointer = null;
}

function init(): void {
  cancelInit = undefined;
  const element = canvas.value;
  if (disposed || !element) return;
  // Without a WebGL implementation (old browsers, test DOMs) the CSS drops stay.
  gpu = typeof WebGLRenderingContext === 'undefined' ? null : createWaterRenderer(element, fail);
  if (!gpu) {
    renderer.value = 'static';
    return;
  }
  readPalette();
  gpu.setCoins(buildCoinAtlas());
  size();
  if (!animate) for (let elapsed = 0; elapsed < STILL_SECONDS; elapsed += 0.1) simulation.step(0.1);
  drawOnce();
  if (!gpu) return;
  renderer.value = 'webgl';
  schedule();
}

watch(
  () => props.active,
  (active) => simulation.setEnergy(active ? 1.8 : 1),
  { immediate: true }
);
watch(
  () => props.paused,
  (paused) => {
    if (paused) stop();
    else wake();
  }
);

onMounted(() => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  motion?.addEventListener?.('change', onMotion);
  animate = readPolicy();
  lastInput = performance.now();
  WAKE_EVENTS.forEach((type) => document.addEventListener(type, wake, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', onVisibility);
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resize = new ResizeObserver(() => {
      size();
      if (!frame) drawOnce();
    });
    resize.observe(root.value);
  }
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) schedule();
      else stop();
    });
    intersection.observe(root.value);
  }
  theme = new MutationObserver(() => {
    readPalette();
    if (!frame) drawOnce();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'design-system-theme'] });
  // Building the caustic table and compiling the shader take a few frames; let the page paint first.
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(init, { timeout: 600 });
    cancelInit = () => window.cancelIdleCallback(handle);
  } else {
    const handle = setTimeout(init, 32);
    cancelInit = () => clearTimeout(handle);
  }
});

onBeforeUnmount(() => {
  disposed = true;
  cancelInit?.();
  stop();
  gpu?.dispose();
  gpu = null;
  motion?.removeEventListener?.('change', onMotion);
  WAKE_EVENTS.forEach((type) => document.removeEventListener(type, wake, { capture: true }));
  document.removeEventListener('visibilitychange', onVisibility);
  resize?.disconnect();
  intersection?.disconnect();
  theme?.disconnect();
});
</script>

<style scoped lang="scss">
.glass-art {
  /* The card colour behind the art; a host with a different backdrop can override it. */
  --glass-art-backdrop: color-mix(
    in srgb,
    var(--s-color-utility-surface, #fdf7fb) 70%,
    var(--s-color-base-background, #faf4f8)
  );
  --glass-art-pink: var(--s-color-theme-accent, #f8087b);
  --glass-art-violet: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 520 / 380;
}
.glass-art-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  touch-action: pan-y;
  &.is-live {
    opacity: 1;
    transition: opacity 600ms ease;
  }
}
.glass-art-probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
.glass-art-probe--surface {
  color: var(--glass-art-backdrop);
}
.glass-art-probe--pink {
  color: var(--glass-art-pink);
}
.glass-art-probe--violet {
  color: var(--glass-art-violet);
}

/* Without WebGL: static drops with a highlight, a refracted glow and a soft offset shadow. */
.glass-art-fallback {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.glass-art-drop {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background:
    radial-gradient(circle at 34% 28%, #fff 0 5%, transparent 9%),
    radial-gradient(circle at 64% 72%, color-mix(in srgb, #fff 55%, transparent), transparent 42%),
    radial-gradient(
      circle at 50% 50%,
      transparent 58%,
      color-mix(in srgb, var(--glass-art-violet) 30%, transparent) 86%,
      color-mix(in srgb, #fff 70%, transparent) 100%
    );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, #fff 45%, transparent),
    18px 22px 26px -10px color-mix(in srgb, var(--glass-art-violet) 30%, transparent);
  &::after {
    content: '';
    position: absolute;
    inset: 16%;
    border-radius: 50%;
    background: var(--glass-art-coin) center / contain no-repeat;
    opacity: 0.8;
  }
}
/* Projected positions and sizes of the three WebGL bubbles. */
.glass-art-drop--1 {
  left: 43.5%;
  top: 41%;
  width: 39%;
}
.glass-art-drop--2 {
  left: 81%;
  top: 20.5%;
  width: 23%;
}
.glass-art-drop--3 {
  left: 9.5%;
  top: 71.5%;
  width: 16%;
}
</style>
