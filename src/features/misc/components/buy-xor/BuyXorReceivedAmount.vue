<template>
  <div class="received-amount" data-test-name="buyXorReceivedAmount">
    <span class="received-amount__coin" aria-hidden="true" :style="{ '--coin': coinUrl }">
      <i class="received-amount__ring" />
      <i class="received-amount__ring received-amount__ring--late" />
    </span>
    <span class="received-amount__value" aria-hidden="true" :data-final="finished">{{ counted }}</span>
    <span class="received-amount__unit" aria-hidden="true">XOR</span>
    <!-- The finished amount for assistive technology, which should not hear every step of the count. -->
    <span class="received-amount__text">{{ finished }} XOR</span>
    <rewards-burst class="received-amount__burst" :active="burst" :count="24" />
  </div>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { computed, nextTick, onMounted, ref } from 'vue';

import { BUY_XOR_JOURNEY_LOGOS, journeyLogoUrl } from '@/features/misc/lib/buyXorJourneyCoins';
import { useCountUp } from '@/features/rewards/composables/useCountUp';
import RewardsBurst from '@/features/rewards/components/rewards/RewardsBurst.vue';

defineOptions({ name: 'BuyXorReceivedAmount' });

/**
 * The payoff of a Buy XOR purchase: the XOR coin pops in and flips, ripples spread from it, confetti flies and the amount
 * counts up to what arrived. Reduced-motion users see the finished amount at once. The amount is a natural decimal
 * string as the swap receipt reports it; the animation only moves what is shown, never the number itself.
 */
const props = defineProps<{ amount: string }>();

const coinUrl = journeyLogoUrl(BUY_XOR_JOURNEY_LOGOS.find((logo) => logo.symbol === 'XOR')!.svg);
const burst = ref(false);
const target = computed(() => {
  try {
    const value = new FPNumber(props.amount);
    return value.isFinity() ? value : null;
  } catch {
    return null;
  }
});
const shown = useCountUp(target, { duration: 1300 });
const format = (value: string) => (value ? new FPNumber(value).toLocaleString(4) : '');
/** What is on screen now, rounded for reading as the page always has; the last frame is the exact amount. */
const counted = computed(() => format(shown.value));
const finished = computed(() => (target.value ? target.value.toLocaleString(4) : props.amount));

onMounted(async () => {
  await nextTick();
  burst.value = true;
});
</script>

<style scoped lang="scss">
.received-amount {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  margin-block: 24px;
  color: var(--s-color-base-content-primary);
  font-size: 32px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.received-amount__coin {
  position: relative;
  flex: 0 0 auto;
  width: 48px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--coin) center / 86% no-repeat;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, #fff 60%, transparent),
    0 6px 16px -6px color-mix(in srgb, var(--s-color-status-success, #34ad87) 55%, transparent);
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 26%, #fff 0 6%, transparent 14%);
  }
}
.received-amount__ring {
  position: absolute;
  inset: 0;
  border: 2px solid var(--s-color-status-success, #34ad87);
  border-radius: 50%;
  opacity: 0;
}
.received-amount__value {
  display: inline-block;
  overflow-wrap: anywhere;
  /* Reserve the width of the finished amount, so the unit beside it does not move as the digits count up. */
  &::after {
    content: attr(data-final);
    display: block;
    height: 0;
    overflow: hidden;
    visibility: hidden;
  }
}
.received-amount__unit {
  font-size: 16px;
  color: var(--s-color-base-content-secondary);
}
.received-amount__text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* Confetti flies out of the coin, over the card around it. */
.received-amount__burst {
  inset: auto;
  top: calc(24px - 120px);
  inset-inline-start: calc(24px - 160px);
  width: 320px;
  height: 240px;
  transform: scale(0.75);
}

@media (prefers-reduced-motion: no-preference) {
  .received-amount__coin {
    animation: received-amount-pop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
  .received-amount__ring {
    animation: received-amount-ripple 1.5s ease-out 0.25s backwards;
    &--late {
      animation-delay: 0.6s;
    }
  }
  .received-amount__value {
    animation: received-amount-rise 0.6s ease 0.1s backwards;
  }
}

@keyframes received-amount-pop {
  0% {
    transform: scale(0.3) perspective(260px) rotateY(-300deg);
    opacity: 0;
  }
  55% {
    opacity: 1;
  }
  100% {
    transform: scale(1) perspective(260px) rotateY(0);
  }
}
@keyframes received-amount-ripple {
  0% {
    opacity: 0;
    transform: scale(1);
  }
  12% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform: scale(2.6);
  }
}
@keyframes received-amount-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
</style>
