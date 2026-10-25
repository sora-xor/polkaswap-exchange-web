<template>
  <div v-if="visible" class="rw-burst" aria-hidden="true">
    <span class="rw-burst__ring"></span>
    <span class="rw-burst__ring rw-burst__ring--late"></span>
    <span v-for="particle in shown" :key="particle.key" class="rw-burst__particle" :style="particle.style"></span>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { prefersReducedMotion } from '@/features/rewards/composables/useReducedMotion';

/**
 * One-shot celebration for a successful claim: two expanding rings and a spray of particles from the centre of
 * the hero. It plays when `active` turns true and removes itself afterwards. Nothing plays for reduced-motion users.
 */
defineOptions({
  name: 'RewardsBurst',
});

const props = withDefaults(
  defineProps<{
    active?: boolean;
    /** Number of particles. */
    count?: number;
    /** How long the burst stays in the DOM, in milliseconds. */
    duration?: number;
  }>(),
  {
    active: false,
    count: 28,
    duration: 2600,
  }
);

const COLORS = ['#ff5aa5', '#8b9cff', '#ffb04a', '#2fd3b3', '#ffffff'];

const visible = ref(false);
let timer = 0;

/** Fixed spread: the same burst on every run, so it is easy to test and never random-looking in a bad way. */
const particles = Array.from({ length: 64 }, (_, index) => {
  const angle = ((index * 137.508) % 360) * (Math.PI / 180);
  const distance = 90 + ((index * 47) % 120);
  const size = 4 + (index % 4) * 2;

  return {
    key: index,
    style: {
      '--tx': `${Math.round(Math.cos(angle) * distance)}px`,
      '--ty': `${Math.round(Math.sin(angle) * distance - 30)}px`,
      '--rot': `${(index * 61) % 360}deg`,
      '--s': `${size}px`,
      '--c': COLORS[index % COLORS.length],
      '--delay': `${(index % 7) * 35}ms`,
      '--dur': `${900 + ((index * 53) % 500)}ms`,
    },
  };
});

const shown = computed(() => particles.slice(0, Math.max(0, Math.min(props.count, particles.length))));

const stop = (): void => {
  window.clearTimeout(timer);
  timer = 0;
  visible.value = false;
};

watch(
  () => props.active,
  (active) => {
    stop();

    if (!active || prefersReducedMotion()) return;

    visible.value = true;
    timer = window.setTimeout(stop, props.duration);
  }
);

onBeforeUnmount(stop);
</script>

<style lang="scss">
.rw-burst {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;

  &__ring {
    position: absolute;
    width: 180px;
    aspect-ratio: 1;
    border: 2px solid rgba(255, 255, 255, 0.85);
    border-radius: 50%;
    opacity: 0;
    animation: rw-burst-ring 1.2s ease-out both;

    &--late {
      border-color: #ff5aa5;
      animation-delay: 0.22s;
    }
  }

  &__particle {
    position: absolute;
    width: var(--s);
    height: var(--s);
    border-radius: 2px;
    background: var(--c);
    box-shadow: 0 0 10px color-mix(in srgb, var(--c) 70%, transparent);
    opacity: 0;
    animation: rw-burst-fly var(--dur) cubic-bezier(0.15, 0.7, 0.3, 1) var(--delay) both;
  }
}

@keyframes rw-burst-ring {
  from {
    opacity: 0.9;
    transform: scale(0.3);
  }
  to {
    opacity: 0;
    transform: scale(3);
  }
}

@keyframes rw-burst-fly {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.4) rotate(0deg);
  }
  12% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--tx), calc(var(--ty) + 60px), 0) scale(1) rotate(var(--rot));
  }
}
</style>
