<template>
  <span class="burn-logo-fire" :class="`burn-logo-fire--${variant}`" :data-renderer="animated ? 'webgl' : 'static'">
    <img :src="logoUrl" :alt="variant === 'tonswap' ? 'Tonswap' : 'SORA'" :class="{ 'is-animated': animated }" />
    <canvas ref="canvas" aria-hidden="true" :class="{ 'is-active': animated }" @webglcontextlost="handleContextLoss" />
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import tonswapUrl from '@/assets/img/tonswap-mark.svg?url';
import soraUrl from '@/assets/img/networks/sora.svg?url';
import {
  canAnimateBurnFire,
  createBurnFireRenderer,
  type BurnFireRenderer,
  type BurnFireVariant,
} from '@/features/misc/lib/burnLogoFire';

/** Brand-shaped fire is decorative; the real logo remains available without animation or WebGL. */
const props = defineProps<{ variant: BurnFireVariant }>();
const logoUrl = computed(() => (props.variant === 'tonswap' ? tonswapUrl : soraUrl));
const canvas = ref<HTMLCanvasElement | null>(null);
const animated = ref(false);
let renderer: BurnFireRenderer | null = null;
let frame = 0;
let lastFrame = 0;
let disposed = false;
let intersecting = true;
let motion: MediaQueryList | undefined;
let observer: IntersectionObserver | undefined;
let source: HTMLImageElement | undefined;
let permanentlyUnavailable = false;

/** Pause GPU work when not visible; the last rendered frame remains stable. */
function stop(): void {
  cancelAnimationFrame(frame);
  frame = 0;
}

/** At most 30 frames per second, independent of the screen's refresh rate. */
function tick(now: number): void {
  frame = 0;
  if (disposed || document.hidden || !intersecting || !renderer) return;
  if (now - lastFrame >= 1000 / 30) {
    lastFrame = now;
    if (!renderer.draw(now / 1000)) {
      disable();
      return;
    }
    animated.value = true;
  }
  frame = requestAnimationFrame(tick);
}

/** Release GPU resources and restore the native SVG without blocking the burn flow. */
function disable(): void {
  stop();
  renderer?.dispose();
  renderer = null;
  animated.value = false;
}

/** Re-evaluate accessibility, visibility, and hardware preferences before animation. */
function sync(): void {
  if (disposed || !canvas.value) return;
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (
    !canAnimateBurnFire({
      reducedMotion: motion?.matches ?? false,
      saveData: device.connection?.saveData,
      hardwareConcurrency: device.hardwareConcurrency,
      deviceMemory: device.deviceMemory,
    })
  ) {
    disable();
    return;
  }
  if (document.hidden || !intersecting) {
    stop();
    return;
  }
  if (!renderer && !permanentlyUnavailable && source?.complete && source.naturalWidth) {
    renderer = createBurnFireRenderer(canvas.value, source, props.variant);
    if (!renderer) permanentlyUnavailable = true;
  }
  if (renderer && !frame) frame = requestAnimationFrame(tick);
}

/** Context loss is nonfatal and never automatically recreates a failing GPU context. */
function handleContextLoss(event: Event): void {
  event.preventDefault();
  permanentlyUnavailable = true;
  disable();
}

onMounted(() => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  motion?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if (typeof IntersectionObserver !== 'undefined' && canvas.value) {
    observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      sync();
    });
    observer.observe(canvas.value);
  }
  source = new Image();
  source.onload = sync;
  source.src = logoUrl.value;
});
onBeforeUnmount(() => {
  disposed = true;
  disable();
  observer?.disconnect();
  motion?.removeEventListener('change', sync);
  document.removeEventListener('visibilitychange', sync);
  if (source) source.onload = null;
});
</script>

<style scoped>
.burn-logo-fire {
  --fire-glow: 0, 152, 234;
  position: relative;
  display: inline-block;
  width: 128px;
  height: 128px;
  flex: 0 0 auto;
  pointer-events: none;
  isolation: isolate;
}
.burn-logo-fire--sora {
  --fire-glow: 238, 44, 57;
}
.burn-logo-fire::before {
  content: '';
  position: absolute;
  inset: 16%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(var(--fire-glow), 0.2), transparent 70%);
  filter: blur(10px);
}
.burn-logo-fire img {
  position: absolute;
  width: 62%;
  height: 62%;
  left: 19%;
  top: 26%;
  object-fit: contain;
  filter: drop-shadow(0 0 14px rgba(var(--fire-glow), 0.3));
}
.burn-logo-fire img.is-animated {
  opacity: 0;
}
.burn-logo-fire canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}
.burn-logo-fire canvas.is-active {
  opacity: 1;
  filter: drop-shadow(0 0 7px rgba(var(--fire-glow), 0.3));
}
</style>
