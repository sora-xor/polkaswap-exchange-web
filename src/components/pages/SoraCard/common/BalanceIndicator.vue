<template>
  <div class="sora-card__info">
    <div class="sora-card__balance-section">
      <s-icon class="sora-card__icon--closed" name="basic-close-24" size="16px"></s-icon>
      <div>
        <p class="sora-card__info-text">{{ t('card.freeCardIssuance') }}</p>
        <p class="sora-card__info-text-details sora-card__info-text-details--secondary">
          {{ t('card.holdNotSufficientXor') }}
        </p>
        <span class="progress-bar">
          <span class="progress-bar--in-progress" ref="progressBar"></span>
        </span>
        <span class="sora-card__balance-indicator">{{ balanceIndicatorAmount }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/math';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';
import { delay } from '@/utils';

defineOptions({ name: 'BalanceIndicator' });

const progressBar = ref<HTMLElement | null>(null);
const { t } = useTranslation();

const euroBalance = computed(() => store.state?.soraCard?.euroBalance ?? '0');
const xorToDeposit = computed<FPNumber>(() => store.state?.soraCard?.xorToDeposit ?? FPNumber.ZERO);

const balanceIndicatorAmount = computed(() => {
  const euroValue = FPNumber.fromNatural(euroBalance.value);
  const remaining = FPNumber.HUNDRED.sub(euroValue);

  return t('card.xorAmountNeeded', {
    xor: xorToDeposit.value.format(3),
    euro: remaining.toFixed(2),
  });
});

const runProgressBarAnimation = async (): Promise<void> => {
  const bar = progressBar.value;
  if (!bar) return;

  const balanceInteger = Math.round(Number(euroBalance.value));
  for (let i = 0; i < balanceInteger; i += 0.12) {
    await delay(1);
    bar.style.setProperty('width', `${i}%`);
  }
};

watch(euroBalance, () => {
  void runProgressBarAnimation();
});

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      void runProgressBarAnimation();
    }, 2_500);
  });
});

defineExpose({
  runProgressBarAnimation,
});
</script>

<style lang="scss" scoped>
.sora-card {
  &__balance-indicator {
    color: #479aef;
    font-size: 18px;
    line-height: 24px;
  }
}
.sora-card__icon {
  &--closed {
    margin-right: var(--s-basic-spacing);
    color: var(--s-color-base-content-secondary);
  }
}
</style>
