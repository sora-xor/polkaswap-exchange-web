<script setup lang="ts">
import { computed } from 'vue';

import type { KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';

/**
 * Gradient container that adapts the background based on the reward token symbol.
 *
 * It is the rewards hero shell: a dark panel with layered, purely decorative motion (drifting glow, a perspective
 * grid, a slow scan line and rising sparks). Every moving layer animates only `transform` and `opacity`, so the
 * compositor runs them, and all of them stop for reduced-motion users.
 */
const props = withDefaults(
  defineProps<{
    symbol?: KnownSymbols | '';
    /** Optional page state; adds a `gradient-box--<state>` class that retunes the glow. */
    state?: string;
  }>(),
  {
    symbol: '',
    state: '',
  }
);

const symbolClass = computed(() => {
  if (!props.symbol) return '';
  return `gradient-box--${props.symbol.toLowerCase()}`;
});

const stateClass = computed(() => (props.state ? `gradient-box--${props.state}` : ''));

const SPARK_COUNT = 14;

/** Fixed pseudo-random spread, so the sparks are identical on every render and in every test. */
const sparks = Array.from({ length: SPARK_COUNT }, (_, index) => {
  const n = index + 1;

  return {
    key: n,
    style: {
      '--x': `${(n * 37 + 11) % 100}%`,
      '--dx': `${((n * 53) % 60) - 30}px`,
      '--s': `${2 + (n % 3)}px`,
      '--d': `${9 + (n % 5) * 2.2}s`,
      '--delay': `${-(n * 1.9)}s`,
    },
  };
});
</script>

<template>
  <div :class="['gradient-box', symbolClass, stateClass]">
    <div class="gradient-box__decor" aria-hidden="true">
      <span class="gradient-box__aurora gradient-box__aurora--a"></span>
      <span class="gradient-box__aurora gradient-box__aurora--b"></span>
      <span class="gradient-box__grid"></span>
      <span class="gradient-box__scan"></span>
      <span v-for="spark in sparks" :key="spark.key" class="gradient-box__spark" :style="spark.style"></span>
    </div>
    <div class="gradient-box__content">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gradient-box {
  --rw-hero-a: #ff3d8b;
  --rw-hero-b: #ffa43a;
  --rw-hero-ink: #ffffff;
  --rw-hero-muted: #cdb9e8;
  --rw-hero-line: rgba(255, 255, 255, 0.16);
  --rw-hero-glass: rgba(255, 255, 255, 0.07);

  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  container-type: inline-size;
  container-name: rw-hero;
  padding: $inner-spacing-big;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--s-border-radius-medium);
  color: var(--rw-hero-ink);
  background:
    radial-gradient(110% 120% at 100% 0%, color-mix(in srgb, var(--rw-hero-a) 34%, transparent) 0%, transparent 56%),
    radial-gradient(90% 110% at 0% 100%, color-mix(in srgb, var(--rw-hero-b) 24%, transparent) 0%, transparent 60%),
    linear-gradient(135deg, #160a26 0%, #2b1247 58%, #3b1760 100%);
  box-shadow:
    0 30px 70px -28px rgba(24, 6, 40, 0.6),
    0 1px 0 rgba(255, 255, 255, 0.14) inset;

  &--pswap {
    --rw-hero-a: #ff3d8b;
    --rw-hero-b: #8b5cf6;
  }

  &--val {
    --rw-hero-a: #e6c25e;
    --rw-hero-b: #f59e0b;
  }

  &--connect {
    --rw-hero-a: #a78bfa;
  }

  &--success {
    --rw-hero-a: #34d399;
    --rw-hero-b: #38bdf8;
  }

  &__decor {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }

  &__content {
    position: relative;
    z-index: 1;
  }

  &__aurora {
    position: absolute;
    width: 70%;
    aspect-ratio: 1;
    border-radius: 50%;
    opacity: 0.55;
    will-change: transform;

    &--a {
      top: -30%;
      right: -12%;
      background: radial-gradient(closest-side, color-mix(in srgb, var(--rw-hero-a) 62%, transparent), transparent);
      animation: rw-drift-a 24s ease-in-out infinite alternate;
    }

    &--b {
      bottom: -42%;
      left: -14%;
      background: radial-gradient(closest-side, color-mix(in srgb, var(--rw-hero-b) 52%, transparent), transparent);
      animation: rw-drift-b 30s ease-in-out infinite alternate;
    }
  }

  &__grid {
    position: absolute;
    inset: auto -25% -34% -25%;
    height: 78%;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.16) 1px, transparent 1px);
    background-size: 46px 46px;
    transform: perspective(520px) rotateX(64deg);
    transform-origin: 50% 0;
    -webkit-mask-image: radial-gradient(60% 70% at 50% 0%, #000 0%, transparent 78%);
    mask-image: radial-gradient(60% 70% at 50% 0%, #000 0%, transparent 78%);
    opacity: 0.42;
  }

  &__scan {
    position: absolute;
    inset: 0 0 auto;
    height: 120px;
    background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.07) 55%, transparent);
    transform: translate3d(0, -100%, 0);
    animation: rw-scan 8s linear infinite;
    will-change: transform;
  }

  &__spark {
    position: absolute;
    bottom: -8px;
    left: var(--x);
    width: var(--s);
    height: var(--s);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 9px 2px color-mix(in srgb, var(--rw-hero-a) 75%, transparent);
    opacity: 0;
    animation: rw-spark var(--d) linear var(--delay) infinite;
  }

  &--ready &__aurora {
    opacity: 0.75;
  }

  &--claiming &__scan {
    animation-duration: 2.4s;
  }
}

:global([design-system-theme='dark']) .gradient-box {
  box-shadow:
    0 30px 70px -26px rgba(10, 2, 24, 0.7),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
  border-color: rgba(255, 255, 255, 0.12);
}

@keyframes rw-drift-a {
  from {
    transform: translate3d(-6%, -4%, 0) scale(1);
  }
  to {
    transform: translate3d(8%, 10%, 0) scale(1.18);
  }
}

@keyframes rw-drift-b {
  from {
    transform: translate3d(4%, 6%, 0) scale(1.1);
  }
  to {
    transform: translate3d(-8%, -8%, 0) scale(0.92);
  }
}

@keyframes rw-scan {
  from {
    transform: translate3d(0, -100%, 0);
  }
  to {
    transform: translate3d(0, 900%, 0);
  }
}

@keyframes rw-spark {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0);
  }
  12% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--dx), -440px, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gradient-box__aurora,
  .gradient-box__scan,
  .gradient-box__spark {
    animation: none;
  }

  .gradient-box__spark {
    display: none;
  }

  .gradient-box__scan {
    display: none;
  }
}
</style>
