<template>
  <section class="buy-xor-run" data-test-name="buyXorRun" :aria-labelledby="titleId">
    <buy-xor-journey-art class="buy-xor-run__art" :stage="art.stage" :failed="art.failed" />
    <h3 :id="titleId">{{ t('buyXor.run.title') }}</h3>
    <p v-if="run.mode.value" class="buy-xor-run__mode">
      {{ t(run.mode.value === 'temporary' ? 'buyXor.run.temporaryMode' : 'buyXor.run.ownMode') }}
    </p>
    <ol class="buy-xor-run__steps">
      <li
        v-for="(step, index) in run.steps.value"
        :key="step.id"
        :class="{ 'is-fresh': fresh[step.id] }"
        :data-step="step.id"
        :data-status="step.status"
        :aria-current="step.status === 'active' ? 'step' : undefined"
      >
        <span class="buy-xor-run__marker" aria-hidden="true">{{
          step.status === 'done' ? '✓' : step.status === 'failed' ? '!' : index + 1
        }}</span>
        <div>
          <strong>{{ t(`buyXor.run.steps.${step.id}.title`, { asset: run.swapAsset.value }) }}</strong>
          <p v-if="step.status === 'active'">{{ detail(step.id) }}</p>
          <!-- MoonPay closed or the payment failed: check the order, or start a new card payment. -->
          <div v-if="step.id === 'receive' && step.status === 'active'" class="buy-xor-run__step-actions">
            <router-link to="/deposit/history">{{ t('fiatPayment.historyBtn') }} →</router-link>
            <button type="button" data-test-name="buyXorRunRestart" @click="emit('restart')">
              {{ t('getTs.cardReviewAgain') }}
            </button>
          </div>
        </div>
      </li>
    </ol>
    <p v-if="run.stage.value === 'done'" class="buy-xor-run__done" role="status">{{ t('buyXor.run.done') }}</p>
    <div v-if="run.failure.value" class="buy-xor-run__notice buy-xor-run__notice--failed" role="alert">
      <p>{{ t(`buyXor.run.failures.${run.failure.value.reason}`) }}</p>
      <button type="button" data-test-name="buyXorRunRetry" @click="run.retry()">{{ t('buyXor.run.retry') }}</button>
    </div>
    <div v-if="savedText" class="buy-xor-run__notice" role="status">
      <p>{{ t('buyXor.run.savedFunds', { amount: savedText }) }}</p>
      <button type="button" data-test-name="buyXorRunUseSaved" @click="run.useSavedWallet()">
        {{ t('buyXor.run.useSaved') }}
      </button>
    </div>
    <div v-if="needsBackup" class="buy-xor-run__notice" role="status">
      <p>{{ t('buyXor.run.notSaved') }}</p>
      <label class="buy-xor-run__confirm">
        <input v-model="backupConfirmed" data-test-name="buyXorRunSaved" type="checkbox" />
        <span>{{ t('temporaryWallet.confirmSaved') }}</span>
      </label>
    </div>
    <details
      v-if="run.mode.value === 'temporary' || run.failure.value?.reason === 'vault'"
      class="buy-xor-run__wallet"
      :open="needsBackup || run.failure.value?.reason === 'vault'"
    >
      <summary>{{ t('buyXor.run.wallet') }}</summary>
      <code v-if="run.mode.value === 'temporary'" dir="ltr">{{ web3.evmAddress }}</code>
      <temporary-wallet-panel />
    </details>
  </section>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { computed, reactive, ref, useId, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import BuyXorJourneyArt from '@/features/misc/components/buy-xor/BuyXorJourneyArt.vue';
import TemporaryWalletPanel from '@/features/misc/components/buy-xor/TemporaryWalletPanel.vue';
import { useBuyXorCardRun } from '@/features/misc/composables/useBuyXorCardRun';
import type { BuyXorRunStep } from '@/features/misc/lib/buyXorCardPurchase';
import type { GetTsBridgeProgress } from '@/features/misc/lib/getTsBridgeProgress';
import type { GetTsConversionProgress } from '@/features/misc/lib/getTsConversionProgress';
import type { GetTsSwapProgress } from '@/features/misc/lib/getTsSwapProgress';
import { useWeb3Store } from '@/stores/web3';

/**
 * Step list of a Buy XOR card purchase after payment, and the engine that moves it on (`useBuyXorCardRun`):
 * ETH from MoonPay → SORA bridge → ETH on SORA → the buyer's swap to XOR. A failed step shows why and
 * "Try again". The page passes its existing progress readers so nothing is polled twice.
 */
defineOptions({ name: 'BuyXorCardRun' });

const props = defineProps<{
  enabled: boolean;
  conversionProgress: GetTsConversionProgress;
  bridgeProgress: GetTsBridgeProgress;
  swapProgress: GetTsSwapProgress;
  refreshConversion: () => Promise<void>;
  refreshBridge: () => Promise<void>;
}>();
const emit = defineEmits<{
  /** A signature is being prepared; the page keeps plan edits locked meanwhile. */
  preparing: [preparing: boolean];
  /** The ETH (or DAI left from the earlier DAI route) reached SORA: the page moves on to the swap. */
  received: [];
  /** The purchase wallet is ready for the card payment. */
  ready: [ready: boolean];
  /** While waiting for MoonPay: the buyer wants to review and pay again (checkout closed or payment failed). */
  restart: [];
}>();

const { t } = useTranslation();
const web3 = useWeb3Store();
const titleId = `buy-xor-run-${useId()}`;
const backupConfirmed = ref(false);
const run = useBuyXorCardRun({
  enabled: () => props.enabled,
  conversion: { progress: computed(() => props.conversionProgress), refresh: () => props.refreshConversion() },
  bridge: { progress: computed(() => props.bridgeProgress), refresh: () => props.refreshBridge() },
  swap: { progress: computed(() => props.swapProgress) },
  onPreparing: (preparing) => emit('preparing', preparing),
});

/** The water art above the list shows the same step as the list: the step that stopped, else the step in progress. */
const art = computed(() => ({ stage: run.failure.value?.step ?? run.stage.value, failed: !!run.failure.value }));
const needsBackup = computed(() => run.mode.value === 'temporary' && !run.persisted.value && !backupConfirmed.value);
const ready = computed(
  () => run.mode.value === 'own' || (run.mode.value === 'temporary' && (run.persisted.value || backupConfirmed.value))
);
const savedText = computed(() => {
  const funds = run.savedFunds.value;
  if (!funds || (funds.eth === 0n && funds.dai === 0n)) return '';
  const format = (value: bigint, symbol: string) =>
    `${FPNumber.fromCodecValue(value.toString(), 18).dp(6, 3).toLocaleString(6)} ${symbol}`;
  return [funds.eth > 0n ? format(funds.eth, 'ETH') : '', funds.dai > 0n ? format(funds.dai, 'DAI') : '']
    .filter(Boolean)
    .join(', ');
});

/** One plain sentence for the active step; the Ethereum step differs by who signs. */
function detail(step: BuyXorRunStep): string {
  if (step === 'receive' && run.mode.value === 'temporary' && run.persisted.value)
    return t('buyXor.run.steps.receive.detailSaved');
  if (step === 'send' && run.mode.value === 'own') return t('buyXor.run.steps.send.detailOwn');
  return t(`buyXor.run.steps.${step}.detail`);
}

/** Steps that finished while this list was on screen; only they play the "done" pop, never the ones loaded as done. */
const fresh = reactive<Record<string, boolean>>({});
watch(
  () => run.steps.value.map((step) => step.status),
  (statuses, before) => {
    statuses.forEach((status, index) => {
      const id = run.steps.value[index].id;
      if (status !== 'done') delete fresh[id];
      else if (before[index] && before[index] !== 'done') fresh[id] = true;
    });
  }
);
watch(ready, (value) => emit('ready', value), { immediate: true });
watch(
  () => run.stage.value,
  (stage, previous) => {
    if (stage === 'swap' && previous && previous !== 'swap' && previous !== 'done') emit('received');
  }
);
</script>

<style scoped lang="scss">
.buy-xor-run {
  margin-bottom: 24px;
  padding: 18px 20px;
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-body);
  box-shadow: var(--s-shadow-element);
  font-size: 13px;
  line-height: 1.5;
  /* The water art bleeds to the card's edges, so it reads as the card's header. */
  &__art {
    margin: -18px -20px 10px;
  }
  h3 {
    margin: 0 0 4px;
    font-size: 16px;
  }
  p {
    margin: 0;
    color: var(--s-color-base-content-secondary);
  }
  &__mode {
    margin-bottom: 12px !important;
  }
  &__steps {
    margin: 0;
    padding: 0;
    list-style: none;
    li {
      position: relative;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 8px 0;
    }
    /* A line joins each step to the next: it fills as steps finish, and runs toward the next step while one is active. */
    li:not(:last-child)::before,
    li:not(:last-child)::after {
      content: '';
      position: absolute;
      inset-inline-start: 11px;
      top: 36px;
      bottom: -6px;
      width: 2px;
      border-radius: 1px;
    }
    li:not(:last-child)::before {
      background: var(--s-color-base-border-secondary);
    }
    li:not(:last-child)::after {
      background: var(--s-color-status-success-text, var(--s-color-status-success));
      transform: scaleY(0);
      transform-origin: top;
      transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    }
    li[data-status='done']:not(:last-child)::after {
      transform: scaleY(1);
    }
    li[data-status='active']:not(:last-child)::after {
      transform: scaleY(1);
      background: repeating-linear-gradient(to bottom, var(--s-color-theme-accent) 0 6px, transparent 6px 12px);
      background-size: 100% 12px;
      animation: buy-xor-run-flow 0.9s steps(6) infinite;
    }
    strong {
      display: block;
      font-weight: 600;
      color: var(--s-color-base-content-secondary);
    }
    li[data-status='active'] strong,
    li[data-status='failed'] strong {
      color: var(--s-color-base-content-primary);
    }
    li[data-status='done'] strong {
      color: var(--s-color-base-content-primary);
      font-weight: 400;
    }
    li p {
      margin-top: 2px;
    }
    li[data-status='active'] p {
      animation: buy-xor-run-rise 0.45s ease backwards;
    }
  }
  &__step-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    align-items: center;
    margin-top: 4px;
    a,
    button {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--s-color-action-text);
      font: inherit;
      text-decoration: none;
      cursor: pointer;
    }
  }
  &__marker {
    position: relative;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-content-secondary);
    font-variant-numeric: tabular-nums;
  }
  li[data-status='done'] &__marker {
    color: var(--s-color-status-success-text, var(--s-color-status-success));
  }
  li.is-fresh[data-status='done'] &__marker {
    animation: buy-xor-run-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  li[data-status='active'] &__marker {
    color: var(--s-color-theme-accent);
    box-shadow: 0 0 0 2px var(--s-color-theme-accent);
    animation: buy-xor-run-pulse 1.6s ease-in-out infinite;
  }
  /* A ring spreads from the step in progress, like a ripple on water. */
  li[data-status='active'] &__marker::after {
    content: '';
    position: absolute;
    inset: -2px;
    border: 2px solid var(--s-color-theme-accent);
    border-radius: 50%;
    opacity: 0;
    animation: buy-xor-run-ripple 1.8s ease-out infinite;
  }
  li[data-status='failed'] &__marker {
    color: var(--s-color-status-error-text, var(--s-color-status-error));
    box-shadow: 0 0 0 2px var(--s-color-status-error-text, var(--s-color-status-error));
    animation: buy-xor-run-shake 0.5s ease-in-out;
  }
  &__done {
    margin-top: 10px !important;
    color: var(--s-color-status-success-text, var(--s-color-status-success)) !important;
    animation: buy-xor-run-rise 0.5s ease backwards;
  }
  &__notice {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: var(--s-border-radius-mini, 8px);
    background: var(--s-color-utility-surface);
    p {
      color: var(--s-color-base-content-primary);
    }
    button {
      margin-top: 8px;
      min-height: 44px;
      padding: 10px 18px;
      border: 0;
      border-radius: var(--s-border-radius-small);
      background: var(--s-color-utility-body);
      box-shadow: var(--s-shadow-element);
      color: var(--s-color-action-text);
      font: inherit;
      cursor: pointer;
    }
    &--failed p {
      color: var(--s-color-status-error-text, var(--s-color-status-error));
    }
  }
  &__confirm {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-top: 10px;
    cursor: pointer;
    input {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      margin-top: 1px;
      accent-color: var(--s-color-theme-accent);
    }
  }
  &__wallet {
    margin-top: 12px;
    summary {
      min-height: 44px;
      padding: 12px 0;
      color: var(--s-color-action-text);
      cursor: pointer;
    }
    code {
      display: block;
      overflow-wrap: anywhere;
      font-size: 12px;
    }
  }
  :is(a, button, summary, input):focus-visible {
    outline: 2px solid var(--s-color-focus-ring, var(--s-color-theme-accent));
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    li[data-status='active'] &__marker,
    li.is-fresh[data-status='done'] &__marker,
    li[data-status='failed'] &__marker,
    li[data-status='active'] p,
    &__done,
    &__steps li[data-status='active']:not(:last-child)::after {
      animation: none;
    }
    li[data-status='active'] &__marker::after {
      display: none;
    }
    &__steps li:not(:last-child)::after {
      transition: none;
    }
  }
}

@keyframes buy-xor-run-pulse {
  50% {
    box-shadow: 0 0 0 4px var(--s-color-theme-accent);
  }
}
@keyframes buy-xor-run-ripple {
  from {
    opacity: 0.55;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.9);
  }
}
@keyframes buy-xor-run-pop {
  0% {
    transform: scale(0.55);
  }
  60% {
    transform: scale(1.22);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes buy-xor-run-shake {
  20% {
    transform: translateX(-3px);
  }
  40% {
    transform: translateX(3px);
  }
  60% {
    transform: translateX(-2px);
  }
  80% {
    transform: translateX(2px);
  }
}
@keyframes buy-xor-run-rise {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}
/* Dashes slide down the line toward the next step. */
@keyframes buy-xor-run-flow {
  to {
    background-position: 0 12px;
  }
}
</style>
