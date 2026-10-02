<template>
  <section class="tonswap-onboarding" aria-labelledby="tonswap-onboarding-title">
    <h3 id="tonswap-onboarding-title">{{ t('burnPage.tonswap.onboarding.title') }}</h3>
    <p class="tonswap-onboarding__intro">{{ t('burnPage.tonswap.onboarding.description') }}</p>
    <fieldset class="tonswap-onboarding__choices">
      <legend class="tonswap-onboarding__legend">{{ t('burnPage.tonswap.onboarding.startingPoint') }}</legend>
      <label
        v-for="option in TONSWAP_STARTING_POINTS"
        :key="option"
        class="tonswap-onboarding__choice"
        :class="{ 'tonswap-onboarding__choice--selected': selected === option }"
      >
        <input v-model="selected" type="radio" name="tonswap-starting-point" :value="option" @change="rememberChoice" />
        <span>{{ t(`burnPage.tonswap.onboarding.options.${option}`) }}</span>
      </label>
    </fieldset>
    <div v-if="selected" class="tonswap-onboarding__guidance" aria-live="polite">
      <p>{{ t(`burnPage.tonswap.onboarding.guidance.${selected}`) }}</p>
      <p v-if="selected === 'newWallet' && googleWalletAvailable">
        {{ t('burnPage.tonswap.onboarding.googleAvailable') }}
      </p>
      <p v-if="selected === 'newWallet'" class="tonswap-onboarding__note">
        {{ t('burnPage.tonswap.onboarding.backup') }}
      </p>
      <s-button class="tonswap-onboarding__continue" type="secondary" native-type="button" @click="continueOnboarding">
        {{ actionLabel }}
      </s-button>
    </div>
    <p class="tonswap-onboarding__note">{{ t('burnPage.tonswap.onboarding.keepFees') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { trackTonswapStep } from '@/features/misc/lib/tonswapTelemetry';
import {
  TONSWAP_STARTING_POINTS,
  buildTonswapFundingRoute,
  createTonswapIntent,
  isTonswapIntentAmount,
  readTonswapIntent,
  writeTonswapIntent,
  type TonswapStartingPoint,
} from '@/features/misc/lib/tonswapOnboarding';

/** Guides funding while keeping account creation and every transaction in their existing reviewed flows. */
defineOptions({ name: 'TonswapOnboarding' });
const props = withDefaults(
  defineProps<{
    isLoggedIn?: boolean;
    googleWalletAvailable?: boolean;
    amount?: string;
  }>(),
  { isLoggedIn: false, googleWalletAvailable: false, amount: '' }
);
const emit = defineEmits<{ connect: []; review: [] }>();
const { t } = useTranslation();
const router = useRouter();
const selected = ref<TonswapStartingPoint | ''>('');

const actionLabel = computed(() => {
  if (!props.isLoggedIn) return t('burnPage.tonswap.onboarding.connect');
  const actions = { xor: 'review', sora: 'swap', exchange: 'exchange', newWallet: 'funding' };
  return selected.value ? t(`burnPage.tonswap.onboarding.actions.${actions[selected.value]}`) : '';
});

/** Saves only a validated public preview amount and the chosen starting point. */
function rememberChoice(): void {
  if (!selected.value) return;
  const intent = createTonswapIntent(selected.value, isTonswapIntentAmount(props.amount) ? props.amount : '');
  if (intent) writeTonswapIntent(intent);
}

/** Connecting or navigating never submits a burn, swaps funds, or authorizes a purchase. */
function continueOnboarding(): void {
  if (!selected.value) return;
  rememberChoice();
  if (!props.isLoggedIn) {
    emit('connect');
    return;
  }
  if (selected.value === 'xor') {
    emit('review');
    return;
  }
  trackTonswapStep('funding_started', selected.value === 'sora' ? 'swap' : 'deposit');
  void router.push(buildTonswapFundingRoute(selected.value));
}

onMounted(() => {
  const saved = readTonswapIntent();
  if (saved) selected.value = saved.startingPoint;
});
watch(() => props.amount, rememberChoice);
</script>

<style scoped lang="scss">
.tonswap-onboarding {
  margin: 16px 0;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    line-height: 1.4;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  &__intro,
  &__note {
    color: var(--s-color-base-content-secondary);
  }

  &__choices {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin: 16px 0;
    padding: 0;
    border: 0;
  }

  &__legend {
    padding: 0 0 8px;
    font-size: 12px;
    color: var(--s-color-base-content-secondary);
  }

  &__choice {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 10px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1.4;

    input {
      flex-shrink: 0;
      margin: 0;
      accent-color: var(--s-color-theme-accent);
    }

    &--selected {
      border-color: var(--s-color-theme-accent);
    }

    &:focus-within {
      outline: 2px solid var(--s-color-theme-accent);
      outline-offset: 2px;
    }
  }

  &__guidance {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
  }

  &__continue {
    justify-self: start;
    max-width: 100%;
    height: auto;
    min-height: 44px;
    white-space: normal;
  }

  @media (max-width: 440px) {
    &__choices {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
