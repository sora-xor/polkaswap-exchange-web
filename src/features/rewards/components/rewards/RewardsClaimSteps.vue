<template>
  <ol class="rw-steps" :class="`rw-steps--${status}`" :aria-label="label">
    <li
      v-for="step in total"
      :key="step"
      class="rw-step"
      :class="`is-${stateOf(step)}`"
      :aria-current="stateOf(step) === 'active' ? 'step' : undefined"
    >
      <span class="rw-step__node">
        <svg v-if="stateOf(step) === 'done'" class="rw-step__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
        <svg v-else-if="stateOf(step) === 'error'" class="rw-step__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
        </svg>
        <template v-else>{{ step }}</template>
      </span>
      <span class="rw-step__name">{{ nameOf(step) }}</span>
    </li>
  </ol>
</template>

<script lang="ts" setup>
import { useTranslation } from '@/composables/useTranslation';

/**
 * Progress of a claim: one node per signature the user has to give (the Ethereum wallet first when external rewards
 * are included, then the SORA account). Done steps show a check, the running step pulses and a failed step shows a
 * cross. The status text next to it stays the source of truth for screen readers.
 */
defineOptions({
  name: 'RewardsClaimSteps',
});

type StepStatus = 'pending' | 'done' | 'error';
type StepState = 'idle' | 'active' | 'done' | 'error';

const props = withDefaults(
  defineProps<{
    /** Number of signatures: 1, or 2 when external rewards are claimed too. */
    total?: number;
    /** The step in progress, starting at 1. */
    current?: number;
    status?: StepStatus;
    /** Accessible name of the list. */
    label?: string;
  }>(),
  {
    total: 1,
    current: 1,
    status: 'pending',
    label: '',
  }
);

const { TranslationConsts } = useTranslation();

const stateOf = (step: number): StepState => {
  if (props.status === 'done' || step < props.current) return 'done';
  if (step > props.current) return 'idle';

  return props.status === 'error' ? 'error' : 'active';
};

/** With two signatures the first one is the Ethereum wallet; the last one is always the SORA account. */
const nameOf = (step: number): string =>
  props.total > 1 && step === 1 ? TranslationConsts.Ethereum : TranslationConsts.Sora;
</script>

<style lang="scss">
.rw-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rw-step {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 96px;
  color: var(--rw-hero-muted, #cdb9e8);
  font-size: var(--s-font-size-extra-small);
  font-weight: 600;

  // Connector to the previous step; it fills once that step is done.
  & + &::before {
    content: '';
    position: absolute;
    top: 13px;
    inset-inline-end: 50%;
    width: 100%;
    height: 2px;
    border-radius: 1px;
    background: rgba(255, 255, 255, 0.18);
  }

  & + &::after {
    content: '';
    position: absolute;
    top: 13px;
    inset-inline-end: 50%;
    width: 100%;
    height: 2px;
    border-radius: 1px;
    background: var(--rw-step-color, #ff5aa5);
    transform: scaleX(0);
    transform-origin: right center;
    transition: transform 0.6s cubic-bezier(0.3, 0.7, 0.2, 1);
  }

  & + &.is-done::after,
  & + &.is-active::after,
  & + &.is-error::after {
    transform: scaleX(1);
  }

  [dir='rtl'] & + &::after {
    transform-origin: left center;
  }

  &__node {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    background: #1d0d31;
    color: var(--rw-hero-ink, #fff);
    font-size: 12px;
    font-weight: 700;
    transition:
      border-color 0.3s ease,
      background-color 0.3s ease;
  }

  &__icon {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;

    path {
      stroke-dasharray: 20;
      animation: rw-check 0.45s ease-out both;
    }
  }

  &.is-active &__node {
    border-color: var(--rw-step-color, #ff5aa5);

    // A ring that grows and fades. Only transform and opacity animate, so it runs on the compositor.
    &::after {
      content: '';
      position: absolute;
      inset: -2px;
      border: 2px solid var(--rw-step-color, #ff5aa5);
      border-radius: 50%;
      animation: rw-step-pulse 1.6s ease-out infinite;
    }
  }

  &.is-done &__node {
    border-color: #34d399;
    background: #34d399;
    color: #04281a;
  }

  &.is-error &__node {
    border-color: #ff8a8a;
    background: #ff8a8a;
    color: #3b0a0a;
  }

  &.is-done,
  &.is-active {
    color: var(--rw-hero-ink, #fff);
  }
}

@keyframes rw-check {
  from {
    stroke-dashoffset: 20;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes rw-step-pulse {
  from {
    opacity: 0.9;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.9);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rw-step {
    &::after,
    &__node {
      transition: none;
    }

    &__icon path {
      animation: none;
    }

    &.is-active &__node::after {
      animation: none;
      opacity: 0.5;
    }
  }
}
</style>
