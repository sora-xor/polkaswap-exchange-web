<template>
  <section class="buy-xor-start" :aria-labelledby="titleId" data-test-name="buyXorStart">
    <h2 :id="titleId" ref="heading" tabindex="-1">{{ t('getTs.sourceTitle') }}</h2>
    <div class="buy-xor-start__methods" role="group" :aria-labelledby="titleId">
      <button
        v-for="method in methods"
        :key="method.source"
        type="button"
        :data-source="method.source"
        :aria-pressed="source === method.source"
        :disabled="locked && source !== method.source"
        @click="select(method.source)"
      >
        <strong>{{ t(method.title) }}</strong
        ><small>{{ t(method.hint) }}</small>
      </button>
    </div>
    <p v-if="source === 'sora' || source === 'ton'" class="buy-xor-start__chosen">
      {{ t(source === 'sora' ? 'getTs.sources.sora.title' : 'buyXor.start.ton') }}
    </p>
    <template v-if="locked">
      <p class="buy-xor-start__locked" role="status">{{ t('buyXor.start.inProgress', { amount: lockedAmount }) }}</p>
      <s-button
        class="buy-xor-start__primary"
        type="primary"
        native-type="button"
        data-test-name="buyXorContinue"
        @click="emit('continue')"
        >{{ t('buyXor.resumeTitle') }}</s-button
      >
    </template>
    <template v-else-if="source">
      <div class="buy-xor-start__box">
        <label :for="amountId">{{ t('getTs.preview.youPay') }}</label>
        <div class="buy-xor-start__field">
          <input
            :id="amountId"
            :value="amount"
            inputmode="decimal"
            autocomplete="off"
            maxlength="60"
            placeholder="0"
            data-test-name="buyXorAmount"
            @input="emit('update:amount', ($event.target as HTMLInputElement).value)"
          />
          <select
            v-if="assets.length > 1"
            :value="asset"
            :aria-label="t('getTs.preview.asset')"
            @change="emit('update:paymentAsset', ($event.target as HTMLSelectElement).value as GetTsPaymentAsset)"
          >
            <option v-for="choice in assets" :key="choice" :value="choice">{{ choice }}</option>
          </select>
          <span v-else class="buy-xor-start__unit">{{ asset }}</span>
        </div>
        <p class="buy-xor-start__hint">
          <span v-if="source === 'card'">{{ t('getTs.preview.cardFeesIncluded') }}</span>
          <span v-if="maxPayment" data-test-name="buyXorMax"
            >{{ t('buyXor.start.max', { amount: money(maxPayment) }) }}
            <button v-if="offerMax" type="button" @click="useAmount(maxPayment)">
              {{ t('buyXor.start.useMax') }}
            </button></span
          >
        </p>
      </div>
      <div class="buy-xor-start__box buy-xor-start__result" role="status" aria-live="polite">
        <span class="buy-xor-start__label">{{ t('buyXor.start.youGet') }}</span>
        <strong
          v-if="xorOut"
          class="buy-xor-start__total"
          :class="{ 'buy-xor-start__total--refreshing': refreshing }"
          data-test-name="buyXorEstimate"
          ><bdi>≈ {{ xorOut }}</bdi> <span>XOR</span></strong
        >
        <p v-else-if="result.state === 'loading'">{{ t('getTs.preview.loading') }}</p>
        <p v-else-if="result.state === 'idle'">{{ t('getTs.preview.start') }}</p>
        <p v-else-if="!problem" class="buy-xor-start__dash" aria-hidden="true">—</p>
        <p v-if="refreshing" class="buy-xor-start__note">{{ t('getTs.preview.loading') }}</p>
        <p v-else-if="xorOut && feeNote" class="buy-xor-start__note">{{ t(feeNote) }}</p>
        <div v-if="problem" class="buy-xor-start__problem" data-test-name="buyXorProblem" :data-problem="problem.key">
          <p>{{ t(problem.key, problem.params) }}</p>
          <button v-if="problem.action" type="button" :disabled="findingAmount" @click="problem.action.run">
            {{ problem.action.label }}
          </button>
          <template v-if="problem.suggest && suggestion">
            <button v-if="suggestion.state === 'ready'" type="button" @click="useAmount(suggestion.preview.amount)">
              {{ t('getTs.preview.useAmount', { amount: suggestion.preview.amount, asset }) }}
            </button>
            <p v-else>{{ t('getTs.preview.noSuggestedAmount') }}</p>
          </template>
        </div>
      </div>
      <s-button
        class="buy-xor-start__primary"
        type="primary"
        native-type="button"
        data-test-name="buyXorContinue"
        :disabled="!canContinue"
        @click="emit('continue')"
        >{{ t('getTs.continuePlan') }}</s-button
      >
      <div class="buy-xor-start__next">
        <h3>{{ t('buyXor.start.next') }}</h3>
        <ol>
          <li v-for="step in nextSteps" :key="step">{{ t(`buyXor.start.steps.${step}`) }}</li>
        </ol>
        <p>{{ t('buyXor.start.stepsNote') }}</p>
      </div>
      <details class="buy-xor-start__details">
        <summary>{{ t('getTs.preview.details') }}</summary>
        <p>{{ t(`buyXor.routes.${source}`) }}</p>
        <p v-if="maxPayment">{{ t('buyXor.start.maxNote') }}</p>
        <p v-if="result.paymentEthAmount">
          {{ t('buyXor.preview.cardEth', { eth: displayGetTsAmount(result.paymentEthAmount, 8) }) }}
        </p>
        <p v-if="result.daiAmount && result.state === 'ready'">
          {{
            t('getTs.preview.dai', {
              amount: displayGetTsAmount(result.daiAmount),
              minimum: displayGetTsAmount(result.daiIntent ?? result.daiAmount),
            })
          }}
        </p>
        <ul v-if="result.feeComponents.length">
          <li v-for="(fee, index) in result.feeComponents" :key="index">
            {{ t(`getTs.preview.fee.${fee.stage}`) }}: {{ displayGetTsAmount(fee.amount, 8) }} {{ fee.symbol }}
            <span v-if="!fee.included">({{ t('getTs.preview.quotedFee') }})</span>
          </li>
        </ul>
        <p v-if="result.priceImpact">
          {{ t('getTs.preview.impact', { impact: displayGetTsAmount(result.priceImpact, 2) }) }}
        </p>
        <p v-if="source === 'card'">{{ t('getTs.preview.cardTerms') }}</p>
        <p>{{ t('buyXor.preview.method') }}</p>
      </details>
    </template>
    <div class="buy-xor-start__other">
      <span>{{ t('buyXor.start.otherWays') }}</span>
      <button
        v-for="other in otherSources"
        :key="other.source"
        type="button"
        :data-source="other.source"
        :aria-pressed="source === other.source"
        :disabled="locked && source !== other.source"
        @click="select(other.source)"
      >
        {{ t(other.label) }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { FPNumber } from '@sora-substrate/sdk';
import { Operation } from '@sora-substrate/sdk/build/types';
import { useTranslation } from '@/composables/useTranslation';
import { displayGetTsAmount, useGetTsPlanPreview } from '@/features/misc/composables/useGetTsPlanPreview';
import { findBuyXorMaxDai, roundBuyXorPayment, scaleBuyXorMaxPayment } from '@/features/misc/lib/buyXorMaxAmount';
import { BUY_XOR_DEFAULT_CARD_USD, buyXorNextSteps } from '@/features/misc/lib/buyXorStart';
import { quoteDai, type GetTsPaymentAsset, type GetTsPlanPreviewResult } from '@/features/misc/lib/getTsPlanQuote';
import type { GetTsSource } from '@/features/misc/lib/getTsFlow';
import { useSettingsStore } from '@/stores/settings';

/**
 * Amount-first start screen for /buy-xor: choose card or crypto, see the XOR estimate and the largest
 * purchase the SORA market can take, then continue to wallet setup. It only emits intents; the page keeps
 * the plan, its locks and every later transaction check.
 */
defineOptions({ name: 'BuyXorQuickStart' });
type StartSource = Exclude<GetTsSource, 'xor'>;
interface Problem {
  key: string;
  params?: Record<string, string>;
  action?: { label: string; run: () => void };
  /** Shows the shared smaller-amount search result under the action. */
  suggest?: boolean;
}
const MAX_TTL_MS = 60_000;
const MAX_RETRY_MS = 15_000;

const props = withDefaults(
  defineProps<{
    source: GetTsSource | null;
    amount: string;
    paymentAsset?: GetTsPaymentAsset;
    /** The page's own plan gate; this screen never decides that a purchase may continue. */
    canContinue: boolean;
    /** An unresolved purchase keeps its saved method and amount until its transactions resolve. */
    locked?: boolean;
  }>(),
  { paymentAsset: undefined, locked: false }
);
const emit = defineEmits<{
  selectSource: [source: StartSource];
  'update:amount': [amount: string];
  'update:paymentAsset': [asset: GetTsPaymentAsset];
  preview: [result: GetTsPlanPreviewResult];
  continue: [];
}>();
const { t } = useTranslation();
const settings = useSettingsStore();
const id = useId();
const titleId = `buy-xor-start-${id}`;
const amountId = `buy-xor-start-amount-${id}`;
const heading = ref<HTMLElement | null>(null);
const methods = [
  { source: 'card', title: 'getTs.sources.card.title', hint: 'buyXor.start.cardHint' },
  { source: 'ethereum', title: 'buyXor.start.crypto', hint: 'buyXor.start.cryptoHint' },
] as const;
const otherSources = [
  { source: 'sora', label: 'getTs.sources.sora.title' },
  { source: 'ton', label: 'buyXor.start.ton' },
] as const;
const maxDai = ref<string | null>(null);
const sample = ref<{ source: GetTsSource; amount: string; paymentAsset: GetTsPaymentAsset; daiAmount: string } | null>(
  null
);
const cardMinimum = ref<string | null>(null);
/** The last ready estimate stays readable while the same request refreshes; the page gate still sees loading. */
const lastReady = ref<GetTsPlanPreviewResult | null>(null);
let maxCheckedAt = 0;
let maxRetryAt = 0;
let maxSearch: AbortController | undefined;

const { assets, asset, result, suggestion, findingAmount, findAmount, restart } = useGetTsPlanPreview({
  source: () => props.source ?? 'card',
  // A locked purchase shows its saved amount without requesting new provider quotes.
  amount: () => (props.locked ? '' : props.amount),
  paymentAsset: () => props.paymentAsset,
  purpose: 'xor',
  onPreview,
  onPaymentAsset: (value) => emit('update:paymentAsset', value),
});

const lockedAmount = computed(() => `${props.amount} ${asset.value ?? ''}`.trim());
const refreshing = computed(() => {
  const current = result.value;
  const previous = lastReady.value;
  return (
    current.state === 'loading' &&
    !!previous &&
    previous.source === current.source &&
    previous.paymentAsset === current.paymentAsset &&
    previous.amount === current.amount
  );
});
const shown = computed(() => (refreshing.value ? (lastReady.value as GetTsPlanPreviewResult) : result.value));
const xorOut = computed(() =>
  shown.value.state === 'ready' && shown.value.spendableXor
    ? new FPNumber(shown.value.spendableXor).toLocaleString(4)
    : ''
);
const feeNote = computed(() =>
  props.source === 'card'
    ? 'buyXor.start.cardFees'
    : props.source === 'ethereum' || props.source === 'ton'
      ? 'buyXor.start.cryptoFees'
      : ''
);
/** The largest amount in the buyer's currency; DAI needs no conversion estimate. */
const maxPayment = computed(() => {
  if (!maxDai.value || !props.source || !asset.value) return null;
  if (asset.value === 'DAI') return roundBuyXorPayment(new FPNumber(maxDai.value), 'DAI');
  const current = sample.value;
  if (!current || current.source !== props.source || current.paymentAsset !== asset.value) return null;
  return scaleBuyXorMaxPayment(maxDai.value, current);
});
const typedAmount = computed(() =>
  /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(props.amount) ? new FPNumber(props.amount) : null
);
/** Offer the maximum only when it is a real step up, so a rescaled estimate does not flicker the link. */
const offerMax = computed(() => {
  if (!maxPayment.value) return false;
  const amount = typedAmount.value;
  return !amount || amount.lt(new FPNumber(maxPayment.value).mul(new FPNumber('0.95')));
});
const nextSteps = computed(() => buyXorNextSteps(props.source, asset.value));
/** One plain explanation per blocked or unavailable estimate, with the single action that fixes it. */
const problem = computed<Problem | null>(() => {
  const value = result.value;
  if (value.state === 'idle' || value.state === 'loading' || value.state === 'ready') return null;
  const retry = { label: t('getTs.retry'), run: () => restart(0) };
  const smaller = {
    label: t(findingAmount.value ? 'getTs.preview.findingAmount' : 'getTs.preview.findAmount'),
    run: () => void findAmount(),
  };
  const minimum = cardMinimum.value;
  const cardBlocked =
    props.source === 'card' &&
    !!minimum &&
    !!maxPayment.value &&
    new FPNumber(minimum).gt(new FPNumber(maxPayment.value));
  if (cardBlocked && (value.reason === 'price-impact' || value.reason === 'card-minimum'))
    return {
      key: 'buyXor.start.cardBlocked',
      params: { minimum: money(minimum as string, 'USD'), maximum: money(maxPayment.value as string, 'USD') },
      action: { label: t('buyXor.start.useCrypto'), run: () => select('ethereum') },
    };
  switch (value.reason) {
    case 'price-impact':
      return maxPayment.value
        ? {
            key: 'buyXor.start.tooBig',
            params: { amount: money(maxPayment.value) },
            action: {
              label: t('getTs.preview.useAmount', { amount: maxPayment.value, asset: asset.value }),
              run: () => useAmount(maxPayment.value as string),
            },
          }
        : { key: 'buyXor.start.tooBigUnknown', action: smaller, suggest: true };
    case 'conversion-impact':
      return { key: 'buyXor.start.conversionTooBig', action: smaller, suggest: true };
    case 'card-minimum':
      return value.providerMinimumUsd
        ? {
            key: 'buyXor.start.cardMinimum',
            params: { amount: money(value.providerMinimumUsd, 'USD') },
            action: {
              label: t('getTs.preview.useAmount', { amount: value.providerMinimumUsd, asset: 'USD' }),
              run: () => useAmount(value.providerMinimumUsd as string),
            },
          }
        : { key: 'buyXor.start.noPrice', action: retry };
    case 'fees-insufficient':
      return { key: 'buyXor.start.tooSmall' };
    case 'invalid-amount':
      return { key: 'getTs.preview.reason.invalid-amount' };
    case 'card-provider':
      return { key: 'buyXor.start.noCardPrice', action: retry };
    case 'mainnet':
    case 'fees-unavailable':
      // Fees arrive right after the node connects; both states clear by themselves.
      return { key: 'buyXor.start.connecting' };
    case 'native-ton':
      return {
        key: 'buyXor.start.nativeTon',
        action: { label: t('buyXor.start.useUsdt'), run: useTonUsdt },
      };
    default:
      return { key: 'buyXor.start.noPrice', action: retry };
  }
});

/** Formats an advisory amount for reading; buttons always emit the canonical string. */
function money(value: string, unit: string = asset.value ?? ''): string {
  // A no-break space keeps "27 USD" together when the sentence wraps.
  return `${new FPNumber(value).toLocaleString(unit === 'ETH' ? 5 : 2)}\u00A0${unit}`.trim();
}
/** A method change is an intent: the page applies its own lock and plan reset. */
function select(source: StartSource): void {
  if (props.locked || props.source === source) return;
  emit('selectSource', source);
}
function useAmount(value: string): void {
  if (!props.locked) emit('update:amount', value);
}
function useTonUsdt(): void {
  if (!props.locked) emit('update:paymentAsset', 'USDT');
}
/** Keeps the latest DAI estimate for scaling the maximum and refreshes the SORA-side search when stale. */
function onPreview(value: GetTsPlanPreviewResult): void {
  emit('preview', value);
  if (value.state === 'ready') lastReady.value = value;
  else if (value.state !== 'loading') lastReady.value = null;
  if (value.reason === 'card-minimum' && value.providerMinimumUsd) cardMinimum.value = value.providerMinimumUsd;
  if (!value.daiAmount || (value.state !== 'ready' && value.reason !== 'price-impact')) return;
  sample.value = {
    source: value.source,
    amount: value.amount,
    paymentAsset: value.paymentAsset,
    daiAmount: value.daiAmount,
  };
  void refreshMaxDai();
}
/** Bounded read-only search; a failure hides the maximum instead of guessing one. */
async function refreshMaxDai(): Promise<void> {
  const now = Date.now();
  if (maxSearch || now < maxRetryAt || (maxDai.value && now - maxCheckedAt < MAX_TTL_MS)) return;
  const controller = new AbortController();
  maxSearch = controller;
  const value = await findBuyXorMaxDai(
    quoteDai,
    { swapFeeCodec: settings.networkFees?.[Operation.Swap], slippageTolerance: settings.slippageTolerance },
    { signal: controller.signal }
  );
  if (controller.signal.aborted) return;
  maxSearch = undefined;
  maxCheckedAt = Date.now();
  maxRetryAt = value ? 0 : maxCheckedAt + MAX_RETRY_MS;
  maxDai.value = value;
}

watch(
  () => [props.source, props.locked] as const,
  ([source, locked], previous) => {
    if (locked) return;
    if (!source) emit('selectSource', 'card');
    else if (source === 'card' && !props.amount && source !== previous?.[0])
      emit('update:amount', BUY_XOR_DEFAULT_CARD_USD);
  },
  { immediate: true }
);
onBeforeUnmount(() => maxSearch?.abort());
defineExpose({ focus: (options?: FocusOptions) => heading.value?.focus(options) });
</script>

<style scoped lang="scss">
.buy-xor-start {
  h2 {
    margin: 0 0 16px;
    font-size: 20px;
  }
  h2:focus {
    outline: none !important;
  }
  h3 {
    margin: 0 0 8px;
    font-size: 14px;
    text-transform: none;
  }
  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);
  }
  button {
    cursor: pointer;
    font: inherit;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  :is(button, summary, select):focus-visible {
    outline: 2px solid var(--s-color-focus-ring, var(--s-color-theme-accent));
    outline-offset: 3px;
  }
  &__methods {
    display: grid;
    grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
    gap: 12px;
    margin-bottom: 20px;
  }
  &__methods button {
    min-height: 72px;
    padding: 14px 16px;
    border: 1px solid transparent;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    color: inherit;
    text-align: start;
    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease,
      color 0.16s ease;
  }
  &__methods button[aria-pressed='true'] {
    border-color: var(--s-color-action-text, var(--s-color-theme-accent));
    color: var(--s-color-action-text, var(--s-color-theme-accent));
    box-shadow: var(--s-shadow-element);
  }
  &__methods strong {
    display: block;
    font-size: 16px;
    margin-bottom: 4px;
  }
  &__methods small {
    display: block;
    font-size: 12px;
    line-height: 1.4;
    color: var(--s-color-base-content-secondary);
  }
  &__chosen {
    margin: -8px 0 16px !important;
    font-weight: 600;
    color: var(--s-color-action-text, var(--s-color-theme-accent)) !important;
  }
  &__box {
    padding: 16px;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    overflow-wrap: anywhere;
  }
  &__box + &__box {
    margin-top: 12px;
  }
  label,
  &__label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--s-color-base-content-secondary);
  }
  &__field {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  &__field input {
    flex: 1;
    min-width: 0;
    min-height: 48px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--s-color-base-content-primary);
    font: inherit;
    font-size: 28px;
    font-weight: 600;
    direction: ltr;
  }
  &__field input:focus-visible {
    outline: none !important;
  }
  &__field:focus-within {
    border-radius: var(--s-border-radius-mini, 6px);
    outline: 2px solid var(--s-color-focus-ring, var(--s-color-theme-accent));
    outline-offset: 6px;
  }
  &__field select,
  &__unit {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element);
    color: var(--s-color-base-content-primary);
    font: inherit;
    font-size: 16px;
    font-weight: 600;
    line-height: 44px;
  }
  &__hint {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    margin-top: 10px !important;
    font-size: 12px !important;
  }
  &__hint button,
  &__problem button {
    min-height: 32px;
    padding: 4px 10px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    background: none;
    color: var(--s-color-action-text, var(--s-color-theme-accent));
    font-size: 12px;
    font-weight: 600;
  }
  &__result {
    min-height: 92px;
  }
  &__total {
    display: block;
    font-size: clamp(26px, 6vw, 34px);
    line-height: 1.2;
    font-weight: 600;
    color: var(--s-color-base-content-primary);
  }
  &__total bdi {
    direction: ltr;
    unicode-bidi: isolate;
  }
  &__total span {
    font-size: 0.55em;
    font-weight: 400;
  }
  &__total--refreshing {
    opacity: 0.55;
  }
  &__dash {
    font-size: 26px !important;
  }
  &__note {
    margin-top: 6px !important;
    font-size: 12px !important;
  }
  &__problem {
    margin-top: 12px;
    padding: 12px 14px;
    border-inline-start: 3px solid var(--s-color-status-warning, var(--s-color-theme-accent));
    border-radius: var(--s-border-radius-mini, 6px);
    background: var(--s-color-utility-surface);
  }
  &__problem p {
    color: var(--s-color-base-content-primary);
  }
  &__problem button {
    margin-top: 6px;
    padding-inline: 0;
    min-height: 36px;
  }
  &__primary {
    width: 100%;
    min-height: 52px;
    margin-top: 20px;
  }
  &__locked {
    padding: 14px 16px;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
  }
  &__next {
    margin-top: 24px;
  }
  &__next ol {
    margin: 0 0 10px;
    padding-inline-start: 20px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--s-color-base-content-primary);
  }
  &__next li + li {
    margin-top: 6px;
  }
  &__next p {
    font-size: 12px;
  }
  &__details {
    margin-top: 16px;
    font-size: 12px;
    line-height: 1.6;
    summary {
      min-height: 44px;
      padding-block: 12px;
      color: var(--s-color-action-text, var(--s-color-theme-accent));
      cursor: pointer;
    }
    p,
    ul {
      margin: 0 0 8px;
      font-size: 12px;
    }
    ul {
      padding-inline-start: 20px;
      color: var(--s-color-base-content-secondary);
    }
  }
  &__other {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--s-color-base-border-secondary);
    font-size: 12px;
    color: var(--s-color-base-content-secondary);
  }
  &__other button {
    min-height: 40px;
    padding: 8px 12px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    background: none;
    color: var(--s-color-action-text, var(--s-color-theme-accent));
    font-size: 12px;
  }
  &__other button[aria-pressed='true'] {
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    font-weight: 600;
  }
  :deep(.el-button) {
    max-width: 100%;
    white-space: normal;
    height: auto;
  }
  @media (hover: hover) {
    &__methods button:not(:disabled):hover {
      border-color: var(--s-color-action-text, var(--s-color-theme-accent));
    }
    &__hint button:hover,
    &__problem button:not(:disabled):hover,
    &__other button:not(:disabled):hover {
      text-decoration: underline;
    }
  }
  @media (max-width: 480px) {
    &__methods {
      gap: 10px;
    }
    &__methods button {
      padding: 12px;
    }
    &__field input {
      font-size: 24px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none !important;
    }
  }
}
</style>
