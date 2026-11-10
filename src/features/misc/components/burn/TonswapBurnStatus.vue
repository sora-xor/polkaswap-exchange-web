<template>
  <section
    class="burn-status"
    :class="{ 'burn-status--burst': bursting }"
    :data-phase="phase"
    :data-settled="settled"
    :aria-label="message"
  >
    <span v-if="!reducedMotion && !settled" class="burn-status__embers" aria-hidden="true">
      <i v-for="ember in idleEmbers" :key="ember.id" :style="emberStyle(ember)" />
    </span>
    <span v-if="bursting" class="burn-status__embers burn-status__embers--burst" aria-hidden="true">
      <i v-for="ember in burstEmbers" :key="ember.id" :style="emberStyle(ember)" />
    </span>
    <div class="burn-status__main">
      <span class="burn-status__flame" aria-hidden="true">
        <s-icon :name="settled && phase !== 'failed' ? 'basic-check-mark-24' : 'basic-flame-24'" size="28" />
      </span>
      <div class="burn-status__text">
        <p class="burn-status__message" role="status">{{ message }}</p>
        <p v-if="showsReward" class="burn-status__figure" :title="`${reward} TS`">
          <span class="burn-status__value">+{{ finalReward }}</span>
          <span class="burn-status__unit">TS</span>
        </p>
        <p v-else class="burn-status__figure">
          <span class="burn-status__value">{{ amount }}</span>
          <span class="burn-status__unit">XOR</span>
        </p>
        <p v-if="showsReward" class="burn-status__note">
          {{ t('burnPage.tonswap.pendingBurnAmount', { xor: amount }) }}
        </p>
        <p v-else-if="excluded" class="burn-status__note">0 TS · {{ t('burnPage.tonswap.excludedAccount') }}</p>
        <p v-else-if="estimate && phase !== 'failed'" class="burn-status__note">
          {{ t('burnPage.tonswap.journey.estimated') }}: ≈ {{ estimate }} TS
        </p>
      </div>
    </div>
    <ol class="burn-status__steps">
      <li
        v-for="step in steps"
        :key="step.id"
        class="burn-status__step"
        :data-step="step.id"
        :data-state="step.state"
        :aria-current="step.state === 'active' ? 'step' : undefined"
      >
        <span class="burn-status__dot" aria-hidden="true" />
        <span class="burn-status__label">{{ t(`burnPage.tonswap.steps.${step.id}`) }}</span>
      </li>
    </ol>
    <p v-if="phase === 'updated'" class="burn-status__claim">{{ t('burnPage.tonswap.claimNotice') }}</p>
    <p v-if="delayed && !settled" class="burn-status__claim">{{ t('burnPage.tonswap.indexingDelayed') }}</p>
    <div v-if="settled || delayed" class="burn-status__actions">
      <s-button
        v-if="settled"
        class="burn-status__dismiss"
        type="secondary"
        native-type="button"
        @click="emit('dismiss')"
      >
        {{ t('burnPage.tonswap.burnMore') }}
      </s-button>
      <s-button
        v-else
        class="burn-status__refresh"
        type="secondary"
        native-type="button"
        :disabled="busy"
        @click="emit('retry')"
      >
        {{ t('burnPage.tonswap.retryStatus') }}
      </s-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FPNumber } from '@sora-substrate/sdk';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { formatBurnAmount } from '@/features/misc/lib/burnCampaigns';
import {
  createBurnEmbers,
  getTonswapBurnSteps,
  isTonswapBurnSettled,
  type BurnEmber,
  type TonswapBurnPhase,
} from '@/features/misc/lib/tonswapBurnStatus';
import { useReducedMotion } from '@/features/rewards/composables/useReducedMotion';

/**
 * Live feedback for the newest burn of this wallet: what was burned, how far the transaction is
 * (sent, in a block, final, TS reserved) and, once the indexer lists it, the TS it reserved.
 *
 * The banner only shows what the parent already established. `reward` must be the exact indexed
 * reservation when `phase` is `updated`; before that it is the advisory estimate and is labelled
 * as one. Numbers always show their final value; the sparks are decoration and do not run for
 * reduced-motion users.
 */
defineOptions({ name: 'TonswapBurnStatus' });

const props = withDefaults(
  defineProps<{
    phase: TonswapBurnPhase;
    /** Burned XOR as an exact decimal string. */
    amount: string;
    /** Progress sentence chosen by the page for this phase. */
    message: string;
    /** Indexed TS once `phase` is `updated`, otherwise the current estimate, or null when unknown. */
    reward?: FPNumber | null;
    /** The source earns no TS (SORA Trust); the burn finishes at finality. */
    excluded?: boolean;
    /** Confirmation or indexing is taking longer than the fast retry window. */
    delayed?: boolean;
    /** A status refresh is running, so the refresh button waits. */
    busy?: boolean;
  }>(),
  { reward: null, excluded: false, delayed: false, busy: false }
);
const emit = defineEmits<{ dismiss: []; retry: [] }>();

const BURST_MS = 2600;
const { t } = useTranslation();
const reducedMotion = useReducedMotion();
const idleEmbers = createBurnEmbers(10, 7);
const burstEmbers = createBurnEmbers(30, 42);
const bursting = ref(false);
let burstTimer: ReturnType<typeof setTimeout> | undefined;

const steps = computed(() => getTonswapBurnSteps(props.phase, props.excluded));
const settled = computed(() => isTonswapBurnSettled(props.phase, props.excluded));
/** Only an indexed reservation is shown as earned TS; an estimate never takes the headline. */
const showsReward = computed(() => props.phase === 'updated' && !props.excluded && !!props.reward);
const finalReward = computed(() => (props.reward ? formatBurnAmount(props.reward, 4) : ''));
const estimate = computed(() => (props.reward && !showsReward.value ? formatBurnAmount(props.reward, 4) : ''));

/** Positions one spark with custom properties, so the keyframes stay shared. */
function emberStyle(ember: BurnEmber): Record<string, string> {
  return {
    left: `${ember.left}%`,
    width: `${ember.size}px`,
    height: `${ember.size}px`,
    '--drift': `${ember.drift}px`,
    '--rise': `${ember.rise}px`,
    'animation-delay': `${ember.delay}ms`,
    'animation-duration': `${ember.duration}ms`,
  };
}

/** Plays the one-shot burst and removes its elements afterwards. */
function burst(): void {
  clearTimeout(burstTimer);
  if (reducedMotion.value) return;
  bursting.value = true;
  burstTimer = setTimeout(() => (bursting.value = false), BURST_MS);
}

// The burst marks the moment the reservation is indexed; a banner that mounts already finished stays calm.
watch(
  () => props.phase,
  (phase, previous) => {
    if (phase === 'updated' && previous !== 'updated' && !props.excluded) burst();
  }
);

onBeforeUnmount(() => clearTimeout(burstTimer));
</script>

<style scoped lang="scss">
.burn-status {
  --burn-status-ink: #ffffff;
  --burn-status-soft: rgba(255, 255, 255, 0.78);
  --burn-status-line: rgba(255, 255, 255, 0.28);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border-radius: var(--s-border-radius-mini);
  // The furnace keeps its own dark surface in both themes, so the white text always has contrast.
  background:
    radial-gradient(120% 90% at 100% 110%, rgba(255, 122, 61, 0.55), transparent 60%),
    radial-gradient(90% 80% at 0% 0%, rgba(0, 152, 234, 0.45), transparent 62%),
    linear-gradient(135deg, #15173a 0%, #3a1450 52%, #7d1747 100%);
  color: var(--burn-status-ink);
  text-align: start;
  box-shadow: 0 14px 34px -18px rgba(125, 23, 71, 0.75);

  p {
    margin: 0;
  }

  &[data-phase='failed'] {
    background: linear-gradient(135deg, #2a2230 0%, #4a2634 100%);
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }
  &__flame {
    display: grid;
    flex: 0 0 52px;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.3),
      0 0 26px rgba(255, 140, 80, 0.55);
    color: #ffd9a8;
    :deep(.s-icon),
    :deep(i) {
      color: inherit;
    }
  }
  &[data-settled='true'] &__flame {
    color: #ffffff;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.45),
      0 0 26px rgba(120, 220, 255, 0.5);
  }
  &[data-phase='failed'] &__flame {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  }
  &__text {
    flex: 1;
    min-width: 0;
  }
  &__message {
    color: var(--burn-status-soft);
    font-size: 13px;
    line-height: 1.45;
    font-weight: 500;
  }
  &__figure {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 8px;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  &__value {
    display: inline-block;
    min-width: 0;
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
    direction: ltr;
    unicode-bidi: isolate;
  }
  &__unit {
    font-size: 15px;
    font-weight: 600;
    color: var(--burn-status-soft);
  }
  &__note,
  &__claim {
    color: var(--burn-status-soft);
    font-size: 12px;
    line-height: 1.5;
  }
  &__note {
    margin-top: 2px;
  }

  &__steps {
    display: grid;
    grid-auto-columns: #{'minmax(0, 1fr)'};
    grid-auto-flow: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  &__step {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--burn-status-soft);
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    // The connector runs from the previous dot to this one.
    &::before {
      content: '';
      position: absolute;
      top: 8px;
      inset-inline-end: 50%;
      width: 100%;
      height: 2px;
      background: var(--burn-status-line);
    }
    &:first-child::before {
      content: none;
    }
    &[data-state='done']::before,
    &[data-state='active']::before {
      background: var(--burn-status-ink);
    }
    &[data-state='done'],
    &[data-state='active'] {
      color: var(--burn-status-ink);
    }
    &[data-state='active'] {
      font-weight: 700;
    }
  }
  &__dot {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    width: 18px;
    height: 18px;
    border: 2px solid var(--burn-status-line);
    border-radius: 50%;
    background: #33164a;
  }
  &__step[data-state='done'] &__dot {
    border-color: var(--burn-status-ink);
    background: var(--burn-status-ink);
    // A check drawn with two borders keeps the mark crisp at this size without another icon request.
    &::after {
      content: '';
      position: absolute;
      top: 1px;
      left: 4px;
      width: 4px;
      height: 8px;
      border: solid #5a1650;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }
  &__step[data-state='active'] &__dot {
    border-color: var(--burn-status-ink);
    background: #ff8a4c;
    box-shadow: 0 0 0 0 rgba(255, 138, 76, 0.7);
  }
  &__step[data-state='failed'] &__dot {
    border-color: #ff9fb4;
    background: #ff5c7a;
  }
  &__step[data-state='failed'] {
    color: #ffd0da;
    font-weight: 700;
  }
  &__label {
    max-width: 100%;
    padding: 0 2px;
    overflow-wrap: anywhere;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  :deep(.burn-status__dismiss.el-button),
  :deep(.burn-status__refresh.el-button) {
    width: auto;
    min-width: 132px;
    max-width: 100%;
    height: auto;
    min-height: 40px;
    margin: 0;
    padding: 9px 18px;
    border: 0;
    background: #ffffff;
    box-shadow: none;
    color: #4a1450;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    text-transform: none;
    white-space: normal;
    &:hover,
    &:focus-visible {
      background: #ffe9f3;
      color: #4a1450;
    }
    &.is-disabled,
    &:disabled {
      opacity: 0.6;
    }
  }

  &__embers {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    i {
      position: absolute;
      bottom: -12px;
      border-radius: 50%;
      background: radial-gradient(circle, #fff3d6 0 30%, #ffb04a 55%, rgba(255, 90, 60, 0) 72%);
      opacity: 0;
      animation: burn-status-rise 1.4s ease-out infinite;
    }
    &--burst {
      z-index: 2;
      i {
        animation-iteration-count: 1;
        animation-fill-mode: both;
      }
    }
  }
}

// The banner is measured by the campaign card around it, so it tightens on a phone and inside Get TS.
@container tonswap (max-width: 479px) {
  .burn-status {
    gap: 14px;
    padding: 16px;
  }
  .burn-status__flame {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
  }
  .burn-status__value {
    font-size: 26px;
  }
  .burn-status__step {
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .burn-status {
    animation: burn-status-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  }
  .burn-status:not([data-settled='true']) .burn-status__flame {
    animation: burn-status-flicker 1.6s ease-in-out infinite;
  }
  .burn-status__step[data-state='active'] .burn-status__dot {
    animation: burn-status-pulse 1.4s ease-out infinite;
  }
  .burn-status--burst .burn-status__value {
    animation: burn-status-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
}

@keyframes burn-status-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.985);
  }
}
@keyframes burn-status-rise {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.6);
  }
  15% {
    opacity: 0.95;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--drift), calc(var(--rise) * -1), 0) scale(1);
  }
}
@keyframes burn-status-flicker {
  0%,
  100% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.07) rotate(-2deg);
  }
  70% {
    transform: scale(0.97) rotate(2deg);
  }
}
@keyframes burn-status-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 138, 76, 0.7);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(255, 138, 76, 0);
  }
}
@keyframes burn-status-pop {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
}
</style>
