<template>
  <div
    ref="root"
    class="journey-art"
    :class="[`journey-art--${targets.mood}`, { 'is-celebrating': celebrating }]"
    :data-renderer="renderer"
    :data-stage="stage"
    :data-mood="targets.mood"
    :data-flow="flowName"
    data-test-name="buyXorJourneyArt"
    aria-hidden="true"
  >
    <span class="journey-art__glow"><span class="journey-art__aura" :style="auraStyle" /></span>
    <canvas
      ref="canvas"
      class="journey-art__canvas"
      :class="{ 'is-live': renderer === 'webgl' }"
      @pointermove="onPointer"
      @pointerleave="onPointerLeave"
      @pointerdown="onPress"
    />
    <span v-if="renderer === 'static'" class="journey-art__fallback" :style="flowStyle">
      <i
        v-for="drop in drops"
        :key="drop.symbol"
        class="journey-art__drop"
        :class="{ 'is-focus': drop.focus, 'is-trouble': drop.trouble }"
        :data-coin="drop.symbol"
        :style="drop.style"
      />
      <template v-if="targets.flow">
        <b v-for="index in BEADS" :key="index" class="journey-art__bead" :style="{ '--i': index - 1 }" />
      </template>
    </span>
    <rewards-burst class="journey-art__burst" :style="burstStyle" :active="celebrating" />
    <span ref="probeSurface" class="journey-art__probe journey-art__probe--surface" />
    <span ref="probePink" class="journey-art__probe journey-art__probe--pink" />
    <span ref="probeViolet" class="journey-art__probe journey-art__probe--violet" />
    <span ref="probeSuccess" class="journey-art__probe journey-art__probe--success" />
    <span ref="probeProblem" class="journey-art__probe journey-art__probe--problem" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import RewardsBurst from '@/features/rewards/components/rewards/RewardsBurst.vue';
import {
  BUY_XOR_JOURNEY_FOCUS_LIFT,
  buyXorJourneyLayout,
  buyXorJourneyTargets,
  type BuyXorJourneyStage,
} from '@/features/misc/lib/buyXorJourney';
import { BUY_XOR_JOURNEY_LOGOS, journeyLogoUrl } from '@/features/misc/lib/buyXorJourneyCoins';

import type { WaterRenderer } from '@/features/bot-trading/quant-water-renderer';
import type { JourneySimulation } from '@/features/misc/lib/buyXorJourneyWater';

defineOptions({ name: 'BuyXorJourneyArt' });

/**
 * Decorative status art for a Buy XOR card purchase: three water bubbles printed with ETH, ETH on SORA and XOR.
 * Size, liveliness and the droplets between the bubbles follow the step in progress, so the buyer can see at a glance
 * where the money is. The water turns green when the purchase is done and amber when a step stopped. Swiping across a
 * bubble pushes it and spins its coin.
 *
 * It reuses the Quant Loop's ray-traced WebGL water (loaded after first paint), stops by itself when off-screen, in a
 * hidden tab or after two minutes without input, draws one still frame for reduced motion or constrained devices,
 * and shows CSS drops with the same sizes, flow and celebration when WebGL is unavailable. It never receives prices,
 * balances or addresses; the step list beside it carries the real status for screen readers.
 */
const props = defineProps<{
  stage: BuyXorJourneyStage;
  /** The step in progress stopped and needs the buyer's attention. */
  failed?: boolean;
}>();

/** Number of droplets in the flow; the water scene has four beads. */
const BEADS = 4;
/** Thirty frames a second is plenty for slow water and halves the GPU work of sixty. */
const FRAME_MS = 1000 / 30;
const IDLE_MS = 120_000;
/** Frames this far apart, twelve in a row, mean the device cannot keep up (software WebGL, a busy page): it goes still. */
const SLOW_GAP_MS = 150;
const SLOW_FRAMES = 12;
const CELEBRATE_MS = 3200;
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
/** How far the rim and fill lights move toward the mood colour, and how fast (seconds). */
const MOOD_PINK = 1;
const MOOD_VIOLET = 0.85;
const MOOD_SECONDS = 0.7;
/** Used when a theme colour cannot be read: the renderer's own fallbacks. */
const FALLBACK_PINK: Rgb = [0.973, 0.031, 0.482];
const FALLBACK_VIOLET: Rgb = [0.62, 0.36, 0.82];

type Rgb = [number, number, number];
interface Lights {
  pink: Rgb;
  violet: Rgb;
}

/** The water code is loaded after first paint: it is large, and the CSS drops need none of it. */
async function loadEngine() {
  const [water, renderers, coins, journey] = await Promise.all([
    import('@/features/bot-trading/quant-water'),
    import('@/features/bot-trading/quant-water-renderer'),
    import('@/features/bot-trading/quant-water-coins'),
    import('@/features/misc/lib/buyXorJourneyWater'),
  ]);
  return { water, renderers, coins, journey };
}
type Engine = Awaited<ReturnType<typeof loadEngine>>;

const logoUrls = BUY_XOR_JOURNEY_LOGOS.map((coin) => journeyLogoUrl(coin.svg));

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const probeSurface = ref<HTMLElement | null>(null);
const probePink = ref<HTMLElement | null>(null);
const probeViolet = ref<HTMLElement | null>(null);
const probeSuccess = ref<HTMLElement | null>(null);
const probeProblem = ref<HTMLElement | null>(null);
/** `pending` until the renderer is tried after first paint, then `webgl` or `static`. */
const renderer = ref<'pending' | 'webgl' | 'static'>('pending');
/** Width / height of the art as measured; the CSS drops spread along the route to fit it. */
const aspect = ref(4);
const celebrating = ref(false);

const targets = computed(() => buyXorJourneyTargets(props.stage, props.failed));
const flowName = computed(() => {
  const flow = targets.value.flow;
  return flow ? `${flow.from ?? 'card'}-${flow.to}` : 'none';
});
const percentX = (x: number) => `${50 + (x / aspect.value) * 50}%`;
const percentY = (y: number) => `${50 - y * 50}%`;

/** Where each CSS drop sits and how big it is, in the same places and sizes as the WebGL bubbles. */
const drops = computed(() => {
  const places = buyXorJourneyLayout(aspect.value);
  return BUY_XOR_JOURNEY_LOGOS.map((coin, index) => {
    const focus = targets.value.focus === index;
    return {
      symbol: coin.symbol,
      focus,
      trouble: targets.value.trouble === index,
      style: {
        '--x': percentX(places[index].x),
        '--y': percentY(places[index].y + (focus ? BUY_XOR_JOURNEY_FOCUS_LIFT : 0)),
        '--r': String(targets.value.bubbles[index].radius),
        '--coin': logoUrls[index],
      } as Record<string, string>,
    };
  });
});

/** The CSS droplets cross from one drop to the next (or in from the left edge, for the card payment). */
const flowStyle = computed(() => {
  const flow = targets.value.flow;
  if (!flow) return {};
  const places = buyXorJourneyLayout(aspect.value);
  const to = places[flow.to];
  const from = flow.from === null ? { x: -aspect.value - 0.3, y: to.y + 0.18 } : places[flow.from];
  return {
    '--fx': percentX(from.x),
    '--fy': percentY(from.y),
    '--tx': percentX(to.x),
    '--ty': percentY(to.y),
    '--flow-seconds': `${flow.seconds}s`,
  } as Record<string, string>;
});

/** A soft glow behind the coin the step is about: pink while it runs, green when done, amber when it stopped. */
const auraStyle = computed(() => {
  const focus = targets.value.focus;
  const place = buyXorJourneyLayout(aspect.value)[focus];
  return {
    '--x': percentX(place.x),
    '--y': percentY(place.y + BUY_XOR_JOURNEY_FOCUS_LIFT),
    '--r': String(targets.value.bubbles[focus].radius),
  } as Record<string, string>;
});

/** Confetti flies out of the XOR bubble, which sits at the end of the route. */
const burstStyle = computed(() => ({ '--burst-x': percentX(buyXorJourneyLayout(aspect.value)[2].x) }));

let engine: Engine | null = null;
let simulation: JourneySimulation | null = null;
let gpu: WaterRenderer | null = null;
let frame = 0;
let lastTick = 0;
let lastDraw = 0;
let lastInput = 0;
let visible = true;
let animate = false;
/** Set when frames came too slowly; the art stays still for the rest of this mount, whatever the motion preference. */
let tooSlow = false;
let slowFrames = 0;
let disposed = false;
let pointer: { x: number; y: number; time: number } | null = null;
let cancelInit: (() => void) | undefined;
let celebrateTimer = 0;
let motion: MediaQueryList | null = null;
let resize: ResizeObserver | null = null;
let intersection: IntersectionObserver | null = null;
let themeObserver: MutationObserver | null = null;
/** Theme colours read from the probes; read again when the theme changes. */
let theme: { surface: string; pink: Rgb; violet: Rgb; success: Rgb | null; problem: Rgb | null } | null = null;
/** The rim and fill light colours as drawn right now, eased toward the mood's colours. */
let lights: Lights | null = null;
let easing = false;

function readPolicy(): boolean {
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (
    !!engine &&
    !tooSlow &&
    engine.water.canAnimateWater({
      reducedMotion: motion?.matches ?? false,
      saveData: device.connection?.saveData,
      hardwareConcurrency: device.hardwareConcurrency,
      deviceMemory: device.deviceMemory,
    })
  );
}

function running(now: number): boolean {
  return animate && visible && !document.hidden && now - lastInput < IDLE_MS;
}

const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
  from.map((value, i) => value + (to[i] - value) * amount) as Rgb;
const rgbString = (color: Rgb) => `rgb(${color.map((channel) => Math.round(channel * 255)).join(', ')})`;

function readTheme(): void {
  if (!engine) return;
  const read = (probe: HTMLElement | null) => (probe ? getComputedStyle(probe).color : '');
  const parse = (probe: HTMLElement | null) => engine!.renderers.parseWaterColor(read(probe));
  theme = {
    surface: read(probeSurface.value),
    pink: parse(probePink.value) ?? FALLBACK_PINK,
    violet: parse(probeViolet.value) ?? FALLBACK_VIOLET,
    success: parse(probeSuccess.value),
    problem: parse(probeProblem.value),
  };
}

/** The light colours the current mood asks for: the theme's pink and violet, tinted toward green or amber. */
function goalLights(): Lights | null {
  if (!theme) return null;
  const mood = targets.value.mood;
  const tint = mood === 'success' ? theme.success : mood === 'problem' ? theme.problem : null;
  return tint
    ? { pink: mix(theme.pink, tint, MOOD_PINK), violet: mix(theme.violet, tint, MOOD_VIOLET) }
    : { pink: theme.pink, violet: theme.violet };
}

/** Moves the lights toward the mood's colours, or straight there with `snap`, and uploads them. */
function easeLights(seconds: number, snap = false): void {
  const goal = goalLights();
  if (!goal || !theme) return;
  if (!lights || snap) {
    lights = goal;
    easing = false;
  } else {
    const amount = 1 - Math.exp(-seconds / MOOD_SECONDS);
    const next = { pink: mix(lights.pink, goal.pink, amount), violet: mix(lights.violet, goal.violet, amount) };
    const distance = Math.max(
      ...next.pink.map((channel, i) => Math.abs(channel - goal.pink[i])),
      ...next.violet.map((channel, i) => Math.abs(channel - goal.violet[i]))
    );
    easing = distance >= 0.004;
    lights = easing ? next : goal;
  }
  gpu?.setPalette({ surface: theme.surface, pink: rgbString(lights.pink), violet: rgbString(lights.violet) });
}

function size(): void {
  const element = root.value;
  if (!element || !element.clientWidth || !element.clientHeight) return;
  aspect.value = element.clientWidth / element.clientHeight;
  simulation?.setAspect(aspect.value);
  if (!gpu) return;
  gpu.resize(element.clientWidth, element.clientHeight, window.devicePixelRatio || 1);
  gpu.setView(aspect.value, 1);
}

/** Draw the current state once; resizing clears the canvas, so stills need a redraw. */
function drawOnce(): void {
  if (gpu && simulation && !gpu.draw(simulation.frame())) fail();
}

function loop(now: number): void {
  frame = 0;
  if (!gpu || !simulation || !running(now)) return;
  if (now - lastDraw >= FRAME_MS - 1) {
    const seconds = lastTick ? (now - lastTick) / 1000 : 0;
    slowFrames = seconds * 1000 > SLOW_GAP_MS ? slowFrames + 1 : 0;
    simulation.step(seconds);
    if (easing) easeLights(seconds);
    lastTick = now;
    lastDraw = now;
    if (!gpu.draw(simulation.frame())) {
      fail();
      return;
    }
    if (slowFrames >= SLOW_FRAMES) {
      // Keep the frame just drawn; a still at the final sizes follows, and nothing animates again on this mount.
      tooSlow = true;
      animate = false;
      still();
      return;
    }
  }
  frame = requestAnimationFrame(loop);
}

function schedule(): void {
  if (frame || !gpu || !running(performance.now())) return;
  // Resume from the present: time spent paused or hidden does not replay as a jump, or count as slow frames.
  lastTick = 0;
  lastDraw = 0;
  slowFrames = 0;
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
  simulation = null;
  renderer.value = 'static';
}

function wake(): void {
  lastInput = performance.now();
  schedule();
}

/** A calm frame at the final sizes, with the bubbles mid-wobble rather than perfect spheres. */
function still(): void {
  if (!simulation) return;
  simulation.setTargets(targets.value, { snap: true });
  simulation.settle();
  easeLights(0, true);
  drawOnce();
}

function onMotion(): void {
  if (!engine) return;
  animate = readPolicy();
  if (animate) schedule();
  else {
    stop();
    still();
  }
}

/** Coming back to the tab counts as input, so a step that changed meanwhile is drawn at once. */
function onVisibility(): void {
  if (document.hidden) stop();
  else wake();
}

/** The finished purchase: confetti over the art, and the XOR bubble flips and throws droplets. */
function celebrate(): void {
  celebrating.value = true;
  window.clearTimeout(celebrateTimer);
  celebrateTimer = window.setTimeout(() => (celebrating.value = false), CELEBRATE_MS);
  simulation?.celebrate(2);
}

/** A point of the art as the viewer sees it (x grows right, y grows up, the art is 2 units high). */
function viewerPoint(event: PointerEvent): { x: number; y: number } | null {
  const box = canvas.value?.getBoundingClientRect();
  if (!box || !box.width || !box.height) return null;
  const half = box.width / box.height;
  return {
    x: ((event.clientX - box.left) / box.width) * 2 * half - half,
    y: 1 - ((event.clientY - box.top) / box.height) * 2,
  };
}

/** Pointer moves push nearby bubbles. */
function onPointer(event: PointerEvent): void {
  const point = viewerPoint(event);
  if (!point || !simulation) return;
  const previous = pointer;
  pointer = { ...point, time: event.timeStamp };
  if (!previous || !animate) return;
  const seconds = Math.max(event.timeStamp - previous.time, 8) / 1000;
  if (simulation.poke(point.x, point.y, (point.x - previous.x) / seconds, (point.y - previous.y) / seconds)) wake();
}

/** A tap pushes the bubble under the finger, for touch screens that never hover. */
function onPress(event: PointerEvent): void {
  const point = viewerPoint(event);
  if (point && animate && simulation?.poke(point.x, point.y, 0.8, -2.4)) wake();
}

function onPointerLeave(): void {
  pointer = null;
}

async function init(): Promise<void> {
  cancelInit = undefined;
  const element = canvas.value;
  if (disposed || !element) return;
  // Without a WebGL implementation (old browsers, test DOMs) the CSS drops stay.
  if (typeof WebGLRenderingContext === 'undefined') {
    renderer.value = 'static';
    return;
  }
  try {
    engine = await loadEngine();
    if (disposed) return;
    gpu = engine.renderers.createWaterRenderer(element, fail);
    if (!gpu) {
      renderer.value = 'static';
      return;
    }
    animate = readPolicy();
    simulation = engine.journey.createJourneySimulation();
    const { coins } = engine;
    gpu.setCoins(coins.buildCoinAtlas(BUY_XOR_JOURNEY_LOGOS.map((coin) => coins.parseCoinLogo(coin.svg))));
    readTheme();
    size();
    if (animate) {
      // The bubbles start as seeds and grow into this stage.
      simulation.setTargets(targets.value);
      easeLights(0, true);
      drawOnce();
    } else still();
    if (!gpu) return;
    renderer.value = 'webgl';
    schedule();
  } catch {
    // The water code could not be loaded (offline, blocked) or failed while starting: the CSS drops are the art.
    if (!disposed) fail();
  }
}

watch(
  () => [props.stage, props.failed] as const,
  ([stage, failed], [previous]) => {
    const finished = stage === 'done' && previous !== 'done';
    if (finished) celebrate();
    if (!simulation) return;
    if (!animate) return still();
    simulation.setTargets(targets.value);
    // The step that starts pops up, like a droplet landing in it.
    if (stage !== previous && !failed && !finished) simulation.kick(targets.value.focus, 0, 1, 2.2);
    wake();
  }
);
watch(
  () => targets.value.mood,
  () => {
    easing = true;
  }
);

onMounted(() => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  motion?.addEventListener?.('change', onMotion);
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
      if (visible) wake();
      else stop();
    });
    intersection.observe(root.value);
  }
  themeObserver = new MutationObserver(() => {
    readTheme();
    easeLights(0, true);
    if (!frame) drawOnce();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'design-system-theme'],
  });
  // Compiling the shader takes a few frames; let the page paint first.
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(() => void init(), { timeout: 600 });
    cancelInit = () => window.cancelIdleCallback(handle);
  } else {
    const handle = window.setTimeout(() => void init(), 32);
    cancelInit = () => window.clearTimeout(handle);
  }
});

onBeforeUnmount(() => {
  disposed = true;
  cancelInit?.();
  stop();
  window.clearTimeout(celebrateTimer);
  gpu?.dispose();
  gpu = null;
  simulation = null;
  motion?.removeEventListener?.('change', onMotion);
  WAKE_EVENTS.forEach((type) => document.removeEventListener(type, wake, { capture: true }));
  document.removeEventListener('visibilitychange', onVisibility);
  resize?.disconnect();
  intersection?.disconnect();
  themeObserver?.disconnect();
});
</script>

<style scoped lang="scss">
.journey-art {
  /* The card colour behind the art; a host with a different backdrop can override it. */
  --journey-art-backdrop: var(--s-color-utility-body, #fbf6f9);
  --journey-art-pink: var(--s-color-theme-accent, #f8087b);
  --journey-art-violet: color-mix(
    in srgb,
    var(--s-color-status-info, #479aef) 45%,
    var(--s-color-theme-accent, #f8087b)
  );
  --journey-art-success: var(--s-color-status-success, #34ad87);
  --journey-art-problem: var(--s-color-status-warning, #eba332);
  --journey-art-glow: var(--journey-art-pink);
  position: relative;
  display: block;
  width: 100%;
  height: clamp(124px, 30vw, 164px);
  /* The route reads left to right in every language, like a map; the coins are logos and are never mirrored. */
  direction: ltr;
  &--success {
    --journey-art-glow: var(--journey-art-success);
  }
  &--problem {
    --journey-art-glow: var(--journey-art-problem);
  }
}
.journey-art__canvas {
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
/* Confetti flies out of the XOR bubble and may spill over the card around the art. */
.journey-art__burst {
  inset: auto;
  top: -90px;
  bottom: -110px;
  left: calc(var(--burst-x, 80%) - 160px);
  width: 320px;
  transform: scale(0.7);
}
.journey-art__probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
  &--surface {
    color: var(--journey-art-backdrop);
  }
  &--pink {
    color: var(--journey-art-pink);
  }
  &--violet {
    color: var(--journey-art-violet);
  }
  &--success {
    color: var(--journey-art-success);
  }
  &--problem {
    color: var(--journey-art-problem);
  }
}

/* Without WebGL: glass drops that grow, breathe and shiver with the stage, and droplets that cross between them. */
.journey-art__fallback {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: journey-art-in 400ms ease backwards;
}
.journey-art__drop {
  position: absolute;
  left: var(--x);
  top: var(--y);
  height: calc(var(--r) * 100%);
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle at 50% 50%,
    transparent 56%,
    color-mix(in srgb, var(--journey-art-glow) 28%, transparent) 84%,
    color-mix(in srgb, #fff 60%, transparent) 100%
  );
  box-shadow: 10px 12px 18px -8px color-mix(in srgb, var(--journey-art-glow) 34%, transparent);
  /* The coin sits under the glass: the logo first, then the water's highlights over it. */
  &::before {
    content: '';
    position: absolute;
    inset: 14%;
    border-radius: 50%;
    background: var(--coin) center / contain no-repeat;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(circle at 34% 26%, #fff 0 5%, transparent 11%),
      radial-gradient(circle at 66% 76%, color-mix(in srgb, #fff 40%, transparent), transparent 38%);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, #fff 55%, transparent),
      inset 0 -5px 9px -3px color-mix(in srgb, #fff 45%, transparent);
  }
}
.journey-art__bead {
  position: absolute;
  left: var(--fx);
  top: var(--fy);
  width: 10px;
  aspect-ratio: 1;
  border-radius: 50%;
  opacity: 0;
  transform: translate(-50%, -50%);
  background:
    radial-gradient(circle at 34% 30%, #fff 0 22%, transparent 42%),
    color-mix(in srgb, var(--journey-art-glow) 22%, rgba(255, 255, 255, 0.55));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.7),
    0 0 8px color-mix(in srgb, var(--journey-art-glow) 40%, transparent);
}

/* The glow behind the coin in focus: same place as the drop, wider, and the colour of the mood. It fades out toward the
   top and bottom of the art so it never ends in a hard edge. */
.journey-art__glow {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
}
.journey-art__aura {
  position: absolute;
  left: var(--x, 50%);
  top: var(--y, 50%);
  height: min(calc(var(--r, 0.5) * 250%), 100%);
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--journey-art-glow) 50%, transparent),
    color-mix(in srgb, var(--journey-art-glow) 26%, transparent) 55%,
    transparent
  );
}

@media (prefers-reduced-motion: no-preference) {
  .journey-art__aura {
    transition:
      left 0.9s cubic-bezier(0.34, 1.56, 0.64, 1),
      top 0.9s cubic-bezier(0.34, 1.56, 0.64, 1),
      height 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
    animation: journey-art-aura 2.8s ease-in-out infinite;
  }
  .journey-art--problem .journey-art__aura {
    animation-duration: 0.9s;
  }
  .journey-art__drop {
    transition:
      height 0.9s cubic-bezier(0.34, 1.56, 0.64, 1),
      left 0.9s cubic-bezier(0.34, 1.56, 0.64, 1),
      top 0.9s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.6s ease;
    &.is-focus {
      animation: journey-art-breathe 2.8s ease-in-out infinite;
    }
    &.is-trouble {
      animation: journey-art-shiver 0.7s ease-in-out infinite;
    }
  }
  .journey-art__bead {
    animation: journey-art-flow var(--flow-seconds, 2.4s) linear infinite;
    animation-delay: calc(var(--i) * var(--flow-seconds, 2.4s) / -4);
  }
  .is-celebrating .journey-art__drop[data-coin='XOR'] {
    animation: journey-art-pop 1.1s cubic-bezier(0.34, 1.56, 0.64, 1);
    &::before {
      animation: journey-art-flip 1.1s ease-in-out;
    }
  }
}

@keyframes journey-art-aura {
  50% {
    opacity: 0.55;
    transform: translate(-50%, -50%) scale(1.08);
  }
}
@keyframes journey-art-in {
  from {
    opacity: 0;
  }
}
@keyframes journey-art-breathe {
  50% {
    transform: translate(-50%, -50%) scale(1.045);
  }
}
@keyframes journey-art-shiver {
  20% {
    transform: translate(calc(-50% - 3px), -50%) rotate(-2deg);
  }
  60% {
    transform: translate(calc(-50% + 3px), -50%) rotate(2deg);
  }
}
@keyframes journey-art-pop {
  40% {
    transform: translate(-50%, -62%) scale(1.14);
  }
}
@keyframes journey-art-flip {
  to {
    transform: perspective(240px) rotateY(360deg);
  }
}
/* A droplet swells as it leaves one drop, arcs over and sinks into the next. */
@keyframes journey-art-flow {
  0% {
    left: var(--fx);
    top: var(--fy);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  16% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  25% {
    left: calc(var(--fx) + (var(--tx) - var(--fx)) * 0.25);
    top: calc(var(--fy) + (var(--ty) - var(--fy)) * 0.25 - 14% * 0.75);
  }
  50% {
    left: calc(var(--fx) + (var(--tx) - var(--fx)) * 0.5);
    top: calc(var(--fy) + (var(--ty) - var(--fy)) * 0.5 - 14%);
  }
  75% {
    left: calc(var(--fx) + (var(--tx) - var(--fx)) * 0.75);
    top: calc(var(--fy) + (var(--ty) - var(--fy)) * 0.75 - 14% * 0.75);
  }
  80% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    left: var(--tx);
    top: var(--ty);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
}
</style>
