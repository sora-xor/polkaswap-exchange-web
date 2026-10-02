<template>
  <svg class="glass-art" :class="{ active }" viewBox="0 0 520 380" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient :id="id('sphere')" cx="34%" cy="30%" r="72%">
        <stop offset="0%" style="stop-color: var(--glass-highlight)" />
        <stop offset="22%" style="stop-color: color-mix(in srgb, var(--glass-pink) 55%, var(--glass-highlight))" />
        <stop offset="62%" style="stop-color: var(--glass-pink)" />
        <stop offset="100%" style="stop-color: color-mix(in srgb, var(--glass-pink) 62%, var(--glass-ink))" />
      </radialGradient>
      <radialGradient :id="id('pearl')" cx="32%" cy="28%" r="76%">
        <stop offset="0%" style="stop-color: var(--glass-highlight)" />
        <stop offset="55%" style="stop-color: color-mix(in srgb, var(--glass-violet) 14%, var(--glass-highlight))" />
        <stop offset="100%" style="stop-color: color-mix(in srgb, var(--glass-violet) 42%, var(--glass-highlight))" />
      </radialGradient>
      <linearGradient :id="id('violet')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" style="stop-color: color-mix(in srgb, var(--glass-violet) 55%, var(--glass-highlight))" />
        <stop offset="100%" style="stop-color: var(--glass-violet)" />
      </linearGradient>
      <linearGradient :id="id('tile')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" style="stop-color: var(--glass-highlight); stop-opacity: 0.62" />
        <stop offset="100%" style="stop-color: var(--glass-highlight); stop-opacity: 0.08" />
      </linearGradient>
      <linearGradient :id="id('rim')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" style="stop-color: var(--glass-highlight)" />
        <stop offset="35%" style="stop-color: color-mix(in srgb, var(--glass-pink) 55%, var(--glass-highlight))" />
        <stop offset="65%" style="stop-color: color-mix(in srgb, var(--glass-violet) 60%, var(--glass-highlight))" />
        <stop offset="100%" style="stop-color: color-mix(in srgb, var(--glass-mint) 45%, var(--glass-highlight))" />
      </linearGradient>
      <linearGradient :id="id('ribbon')" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" style="stop-color: color-mix(in srgb, var(--glass-violet) 45%, transparent)" />
        <stop offset="50%" style="stop-color: color-mix(in srgb, var(--glass-pink) 45%, transparent)" />
        <stop offset="100%" style="stop-color: color-mix(in srgb, var(--glass-violet) 40%, transparent)" />
      </linearGradient>
      <filter :id="id('soft')" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <filter :id="id('shadow')" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="14" stdDeviation="14" style="flood-color: var(--glass-shadow)" />
      </filter>
    </defs>

    <!-- Glass ribbon linking the three stages: research, test, trade. -->
    <path
      class="ribbon-glow"
      d="M60 300 C 140 360, 210 210, 260 200 S 380 60, 470 90"
      :stroke="url('ribbon')"
      :filter="url('soft')"
    />
    <path class="ribbon" d="M60 300 C 140 360, 210 210, 260 200 S 380 60, 470 90" :stroke="url('ribbon')" />

    <g class="tile tile-1" :filter="url('shadow')">
      <rect x="26" y="210" width="150" height="140" rx="38" :fill="url('tile')" :stroke="url('rim')" />
      <circle cx="112" cy="268" r="34" :fill="url('sphere')" />
      <circle cx="72" cy="304" r="22" :fill="url('pearl')" />
      <path
        d="M112 332 L150 332 Q154 332 152 328 L133 294 Q131 290 129 294 L108 328 Q106 332 112 332 Z"
        :fill="url('violet')"
      />
      <rect x="34" y="216" width="134" height="16" rx="8" class="tile-glint" />
    </g>

    <g class="tile tile-2" :filter="url('shadow')">
      <rect x="186" y="126" width="156" height="148" rx="40" :fill="url('tile')" :stroke="url('rim')" />
      <g transform="translate(264 200)">
        <ellipse
          v-for="petal in 8"
          :key="petal"
          cx="0"
          cy="-30"
          rx="13"
          ry="28"
          :transform="`rotate(${petal * 45})`"
          :fill="petal % 3 === 0 ? url('pearl') : petal % 2 ? url('sphere') : url('violet')"
        />
        <circle r="9" :fill="url('sphere')" />
      </g>
      <rect x="196" y="132" width="136" height="16" rx="8" class="tile-glint" />
    </g>

    <g class="tile tile-3" :filter="url('shadow')">
      <rect x="352" y="30" width="146" height="136" rx="36" :fill="url('tile')" :stroke="url('rim')" />
      <circle cx="408" cy="84" r="27" :fill="url('sphere')" />
      <circle cx="458" cy="80" r="19" :fill="url('pearl')" />
      <rect x="378" y="110" width="40" height="36" rx="10" :fill="url('pearl')" class="cube" />
      <path
        d="M440 148 L478 148 Q482 148 480 144 L461 112 Q459 108 457 112 L436 144 Q434 148 440 148 Z"
        :fill="url('violet')"
      />
      <rect x="360" y="36" width="130" height="14" rx="7" class="tile-glint" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { useId } from 'vue';

defineOptions({ name: 'QuantGlassArt' });

/** Decorative glass objects; `active` adds a gentle float while research is running. */
defineProps<{ active?: boolean }>();

const base = useId();
const id = (name: string) => `${base}-${name}`;
const url = (name: string) => `url(#${id(name)})`;
</script>

<style scoped lang="scss">
.glass-art {
  --glass-pink: var(--s-color-theme-accent, #f8087b);
  --glass-violet: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
  --glass-mint: var(--s-color-theme-secondary, #44e5b2);
  --glass-highlight: #fff;
  --glass-ink: var(--s-color-base-content-primary, #2a171f);
  --glass-shadow: color-mix(in srgb, var(--glass-violet) 32%, transparent);
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.ribbon,
.ribbon-glow {
  fill: none;
  stroke-linecap: round;
}
.ribbon {
  stroke-width: 18;
  opacity: 0.7;
}
.ribbon-glow {
  stroke-width: 30;
  opacity: 0.45;
}
.tile rect:first-child {
  stroke-width: 2;
}
.tile-glint {
  fill: #fff;
  opacity: 0.42;
}
.cube {
  stroke: color-mix(in srgb, var(--glass-violet) 30%, transparent);
  stroke-width: 1.5;
}
.tile {
  transform-box: fill-box;
  transform-origin: center;
}
@media (prefers-reduced-motion: no-preference) {
  .tile {
    animation: glass-float 7s ease-in-out infinite;
  }
  .tile-2 {
    animation-delay: -2.3s;
  }
  .tile-3 {
    animation-delay: -4.6s;
  }
  .active .tile {
    animation-duration: 3.2s;
  }
}
@keyframes glass-float {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-9px) rotate(1.5deg);
  }
}
</style>
