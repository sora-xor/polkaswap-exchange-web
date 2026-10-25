<template>
  <div
    ref="root"
    class="rw-reactor"
    :class="{ 'rw-reactor--active': active, 'rw-reactor--idle': percent === null, 'rw-reactor--ready': drawn }"
    v-bind="meterAttrs"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <div class="rw-reactor__stage" aria-hidden="true" @click="ping">
      <span class="rw-reactor__glow"></span>
      <!-- Each rotating ring is its own <svg>: the browser can then turn the root element on the compositor, which it
           cannot do for a <g> inside an SVG. -->
      <svg class="rw-reactor__spinner rw-reactor__spinner--forward" viewBox="0 0 300 300" focusable="false">
        <circle class="rw-reactor__ring" cx="150" cy="150" r="146" />
      </svg>
      <svg class="rw-reactor__spinner rw-reactor__spinner--backward" viewBox="0 0 300 300" focusable="false">
        <circle class="rw-reactor__ticks" cx="150" cy="150" r="130" />
      </svg>
      <svg class="rw-reactor__svg" viewBox="0 0 300 300" focusable="false">
        <circle class="rw-reactor__track" cx="150" cy="150" r="112" />
        <circle
          class="rw-reactor__fill"
          cx="150"
          cy="150"
          r="112"
          transform="rotate(-90 150 150)"
          :stroke-dasharray="CIRCUMFERENCE"
          :style="{ strokeDashoffset: dashOffset }"
        />
        <circle class="rw-reactor__inner" cx="150" cy="150" r="90" />
      </svg>
      <div class="rw-reactor__core">
        <token-logo v-if="primary" :token="primary" :size="LogoSize.LARGE"></token-logo>
        <span v-else class="rw-reactor__mark"></span>
      </div>
      <div
        v-for="(orbiter, index) in orbiters"
        :key="orbiter.key"
        class="rw-reactor__orbit"
        :class="{ 'rw-reactor__orbit--dot': !orbiter.token }"
        :style="orbitStyle(index)"
      >
        <div class="rw-reactor__arm">
          <div class="rw-reactor__satellite">
            <token-logo v-if="orbiter.token" :token="orbiter.token" :size="LogoSize.MEDIUM"></token-logo>
            <i v-else></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useReducedMotion } from '@/features/rewards/composables/useReducedMotion';
import { toWholePercent } from '@/features/rewards/utils/analytics';
import { LogoSize } from '@/lib/soraneo-wallet/src/consts';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

/**
 * The animated centrepiece of the rewards hero.
 *
 * The ring around the core is a meter: it fills to `progress` (0–1), the share of the user's rewards that can be
 * claimed now. The first token sits in the core, the others orbit it, and decorative dots fill the orbit when
 * there are few tokens. Rotation runs on the compositor (transform only); with reduced motion everything holds
 * still. The pointer tilts the stage slightly on devices with a mouse.
 */
defineOptions({
  name: 'RewardsReactor',
  components: {
    TokenLogo: WalletComponentTokenLogo,
  },
});

const props = withDefaults(
  defineProps<{
    /** Tokens to show, most important first. The first one fills the core. */
    tokens?: Asset[];
    /** Share of rewards that can be claimed now, 0–1. Null while unknown (the ring stays empty and dim). */
    progress?: number | null;
    /** Brighter glow while there is something to claim. */
    active?: boolean;
    /** Accessible name of the meter, for example "Unlocked 38%". */
    label?: string;
  }>(),
  {
    tokens: () => [],
    progress: null,
    active: false,
    label: '',
  }
);

const MAX_SATELLITES = 3;
const MIN_ORBITERS = 3;
/** Radius of the meter ring in the 300 × 300 view box. */
const RADIUS = 112;
const CIRCUMFERENCE = Number((2 * Math.PI * RADIUS).toFixed(2));

const root = ref<HTMLElement | null>(null);
const reduced = useReducedMotion();
const drawn = ref(false);
let drawFrame = 0;
let moveFrame = 0;
let pingTimer = 0;

const primary = computed(() => props.tokens[0] ?? null);

const percent = computed<number | null>(() => {
  if (props.progress === null || props.progress === undefined || !Number.isFinite(props.progress)) return null;

  return toWholePercent(props.progress);
});

const meterAttrs = computed(() =>
  percent.value === null
    ? {}
    : {
        role: 'meter',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': percent.value,
        'aria-label': props.label || undefined,
      }
);

/** The ring starts empty and fills once the component is on screen, unless the user prefers reduced motion. */
const dashOffset = computed(() => {
  if (percent.value === null || (!drawn.value && !reduced.value)) return CIRCUMFERENCE;

  return Number((CIRCUMFERENCE * (1 - percent.value / 100)).toFixed(2));
});

const orbiters = computed(() => {
  const satellites = props.tokens.slice(1, 1 + MAX_SATELLITES).map((token) => ({ key: token.address, token }));
  const dots = Array.from({ length: Math.max(MIN_ORBITERS - satellites.length, 0) }, (_, index) => ({
    key: `dot-${index}`,
    token: null as Asset | null,
  }));

  return [...satellites, ...dots];
});

const orbitStyle = (index: number) => {
  const total = orbiters.value.length;
  const dot = !orbiters.value[index].token;

  return {
    '--a0': `${Math.round((index / total) * 360 + 24)}deg`,
    '--dur': `${dot ? 26 + index * 9 : 40 + index * 6}s`,
    // Every other decorative dot rides a smaller ring so the orbit does not look like a single track.
    '--r-scale': dot && index % 2 === 1 ? 0.77 : 1,
  };
};

/** Replays the one-shot ripple on the core. */
const ping = (): void => {
  const element = root.value;

  if (!element || reduced.value) return;

  element.classList.remove('rw-reactor--ping');
  // Force a reflow so the animation restarts when it is clicked repeatedly.
  void element.offsetWidth;
  element.classList.add('rw-reactor--ping');
  window.clearTimeout(pingTimer);
  pingTimer = window.setTimeout(() => element.classList.remove('rw-reactor--ping'), 1100);
};

const handlePointerMove = (event: PointerEvent): void => {
  const element = root.value;

  if (!element || reduced.value || event.pointerType === 'touch' || moveFrame) return;

  const { clientX, clientY } = event;

  moveFrame = requestAnimationFrame(() => {
    moveFrame = 0;

    const rect = element.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const x = Math.min(1, Math.max(-1, ((clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.min(1, Math.max(-1, ((clientY - rect.top) / rect.height - 0.5) * 2));

    element.style.setProperty('--px', x.toFixed(3));
    element.style.setProperty('--py', y.toFixed(3));
  });
};

const handlePointerLeave = (): void => {
  const element = root.value;

  if (!element) return;

  cancelAnimationFrame(moveFrame);
  moveFrame = 0;
  element.style.setProperty('--px', '0');
  element.style.setProperty('--py', '0');
};

onMounted(() => {
  if (typeof requestAnimationFrame !== 'function') {
    drawn.value = true;
    return;
  }

  // Two frames: the empty ring has to be painted once before the fill transition can start.
  drawFrame = requestAnimationFrame(() => {
    drawFrame = requestAnimationFrame(() => {
      drawFrame = 0;
      drawn.value = true;
    });
  });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(drawFrame);
  cancelAnimationFrame(moveFrame);
  window.clearTimeout(pingTimer);
});
</script>

<style lang="scss">
.rw-reactor {
  --rw-size: clamp(220px, 30cqi, 300px);
  --rw-orbit: calc(var(--rw-size) * 0.4867);
  --px: 0;
  --py: 0;

  position: relative;
  flex: 0 0 auto;
  width: var(--rw-size);
  height: var(--rw-size);
  perspective: 900px;
  user-select: none;

  &__stage {
    position: absolute;
    inset: 0;
    transform: rotateX(calc(var(--py) * -9deg)) rotateY(calc(var(--px) * 11deg));
    transition: transform 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
    animation: rw-pop 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
    will-change: transform;
  }

  &__svg,
  &__spinner {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  &__spinner--forward {
    animation: rw-spin 90s linear infinite;
  }

  &__spinner--backward {
    animation: rw-spin 140s linear infinite reverse;
  }

  &__ring {
    fill: none;
    stroke: rgba(255, 255, 255, 0.3);
    stroke-width: 1.25;
    stroke-dasharray: 2 9;
    stroke-linecap: round;
  }

  &__ticks {
    fill: none;
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 9;
    stroke-dasharray: 1.2 10.4;
  }

  // The meter. The track is a lighter step of the fill's own hue so the fill reads against it.
  &__track {
    fill: none;
    stroke: rgba(255, 90, 165, 0.18);
    stroke-width: 8;
  }

  &__fill {
    fill: none;
    stroke: #ff5aa5;
    stroke-width: 8;
    stroke-linecap: round;
    filter: drop-shadow(0 0 6px rgba(255, 90, 165, 0.65));
    transition: stroke-dashoffset 1.5s cubic-bezier(0.22, 0.8, 0.2, 1);
  }

  &--idle &__fill {
    filter: none;
  }

  &--idle &__track {
    stroke: rgba(255, 255, 255, 0.12);
  }

  // The soft light behind the core: an HTML element, so its breathing runs on the compositor.
  &__glow {
    position: absolute;
    inset: 18%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 90, 165, 0.55) 0%,
      rgba(139, 92, 246, 0.22) 55%,
      rgba(139, 92, 246, 0) 100%
    );
    animation: rw-breathe 5s ease-in-out infinite;
  }

  &__inner {
    fill: rgba(16, 6, 30, 0.5);
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 1;
  }

  &--active &__glow {
    animation-duration: 3s;
  }

  &__core {
    position: absolute;
    top: 50%;
    left: 50%;
    display: grid;
    place-items: center;
    width: 0;
    height: 0;

    > * {
      position: absolute;
      transform: translate(-50%, -50%);
    }

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: calc(var(--rw-size) * 0.36);
      aspect-ratio: 1;
      border-radius: 50%;
      border: 2px solid rgba(255, 90, 165, 0.7);
      transform: translate(-50%, -50%) scale(0.7);
      opacity: 0;
    }
  }

  &--ping &__core::before {
    animation: rw-ripple 1s ease-out;
  }

  &__mark {
    width: calc(var(--rw-size) * 0.26);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ffffff, #ff5aa5 55%, #8b5cf6);
    box-shadow: 0 0 28px rgba(255, 90, 165, 0.7);
  }

  &__orbit {
    position: absolute;
    inset: 0;
    transform: rotate(var(--a0, 0deg));
    animation: rw-orbit var(--dur, 40s) linear infinite;
  }

  &__arm {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    transform: translateX(calc(var(--rw-orbit) * var(--r-scale, 1)));
  }

  &__satellite {
    position: absolute;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin: -16px 0 0 -16px;
    border-radius: 50%;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.2),
      0 6px 16px rgba(10, 2, 24, 0.5);
    transform: rotate(calc(var(--a0, 0deg) * -1));
    animation: rw-orbit-upright var(--dur, 40s) linear infinite;
  }

  &__orbit--dot &__satellite {
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    box-shadow: 0 0 12px 2px rgba(255, 90, 165, 0.7);

    i {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #fff;
    }
  }
}

@keyframes rw-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes rw-orbit {
  from {
    transform: rotate(var(--a0, 0deg));
  }
  to {
    transform: rotate(calc(var(--a0, 0deg) + 360deg));
  }
}

// Keeps a satellite upright while its orbit turns.
@keyframes rw-orbit-upright {
  from {
    transform: rotate(calc(var(--a0, 0deg) * -1));
  }
  to {
    transform: rotate(calc(var(--a0, 0deg) * -1 - 360deg));
  }
}

@keyframes rw-breathe {
  0%,
  100% {
    opacity: 0.75;
    transform: scale(0.96);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}

// `scale` is an individual transform property, so this entrance does not fight the pointer tilt on `transform`.
@keyframes rw-pop {
  from {
    opacity: 0;
    scale: 0.82;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

@keyframes rw-ripple {
  from {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(0.7);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rw-reactor {
    &__stage,
    &__spinner,
    &__glow,
    &__orbit,
    &__satellite {
      animation: none;
    }

    &__stage {
      transform: none;
      transition: none;
    }

    &__fill {
      transition: none;
    }
  }
}
</style>
