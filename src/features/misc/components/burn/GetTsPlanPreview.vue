<template>
  <section class="plan-preview" :aria-labelledby="titleId">
    <h2 :id="titleId">{{ t('getTs.preview.title') }}</h2>
    <div class="plan-preview__input">
      <div>
        <label :for="amountId">{{
          t(
            source === 'xor'
              ? purpose === 'xor'
                ? 'buyXor.preview.xorBudget'
                : 'getTs.preview.xorBudget'
              : 'getTs.preview.youPay'
          )
        }}</label>
        <input
          :id="amountId"
          :value="amount"
          inputmode="decimal"
          autocomplete="off"
          maxlength="60"
          placeholder="0"
          @input="emit('update:amount', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label :for="assetId">{{ t('getTs.preview.asset') }}</label>
        <select
          :id="assetId"
          :value="asset"
          :disabled="assets.length === 1"
          @change="emit('update:paymentAsset', ($event.target as HTMLSelectElement).value as GetTsPaymentAsset)"
        >
          <option v-for="choice in assets" :key="choice" :value="choice">{{ choice }}</option>
        </select>
      </div>
    </div>
    <p v-if="source === 'card'" class="plan-preview__input-note">{{ t('getTs.preview.cardFeesIncluded') }}</p>
    <div class="plan-preview__outcome" role="status" aria-live="polite">
      <p v-if="result.state === 'idle'">{{ t('getTs.preview.start') }}</p>
      <p v-else-if="result.state === 'loading'">{{ t('getTs.preview.loading') }}</p>
      <template v-else>
        <template v-if="purpose === 'xor' && result.spendableXor !== undefined && result.state === 'ready'">
          <p class="plan-preview__label">
            {{
              t(result.costCoverage === 'partial' ? 'getTs.preview.receiveXorBeforeGas' : 'getTs.preview.receiveXor')
            }}
          </p>
          <strong class="plan-preview__total">≈ {{ display(result.spendableXor) }} <span>XOR</span></strong>
        </template>
        <template v-else-if="purpose === 'ts' && result.estimatedTs !== undefined && result.state === 'ready'">
          <p class="plan-preview__label">
            {{ t(result.costCoverage === 'partial' ? 'getTs.preview.beforeGasTs' : 'getTs.preview.futureTs') }}
          </p>
          <strong class="plan-preview__total">≈ {{ display(result.estimatedTs, 2) }} <span>TS</span></strong>
        </template>
        <p v-else-if="purpose === 'ts' && result.burnableXor !== undefined && result.state === 'unavailable'">
          {{ t('getTs.preview.partialXor', { xor: display(result.burnableXor) }) }}
        </p>
        <p v-if="result.reason" class="plan-preview__reason">
          {{ t(reasonKey, { minimum: result.providerMinimumUsd ?? '' }) }}
        </p>
        <button v-if="canUseMinimum" type="button" @click="emit('update:amount', result.providerMinimumUsd!)">
          {{ t('getTs.preview.useMinimum', { amount: result.providerMinimumUsd }) }}
        </button>
        <template v-if="canSuggest">
          <button type="button" :disabled="findingAmount" @click="findAmount">
            {{ t(findingAmount ? 'getTs.preview.findingAmount' : 'getTs.preview.findAmount') }}
          </button>
          <template v-if="suggestion?.state === 'ready'">
            <p>{{ t('getTs.preview.suggestedAmount', { amount: suggestion.preview.amount, asset }) }}</p>
            <button type="button" @click="emit('update:amount', suggestion.preview.amount)">
              {{ t('getTs.preview.useAmount', { amount: suggestion.preview.amount, asset }) }}
            </button>
          </template>
          <p v-else-if="suggestion">{{ t('getTs.preview.noSuggestedAmount') }}</p>
        </template>
        <div v-if="result.costCoverage === 'partial'" class="plan-preview__gas">
          <p class="plan-preview__label">{{ t('getTs.preview.remainingCosts') }}</p>
          <p>{{ t(source === 'ton' ? 'getTs.preview.tonGasSummary' : 'getTs.preview.ethereumGasSummary') }}</p>
        </div>
        <button
          v-if="
            result.state === 'unavailable' &&
            !['native-ton', 'invalid-amount', 'unsupported-asset'].includes(result.reason ?? '')
          "
          type="button"
          @click="restart(0)"
        >
          {{ t('getTs.preview.retry') }}
        </button>
      </template>
    </div>
    <details
      v-if="result.state === 'ready' || result.feeComponents.length || result.daiAmount || result.paymentEthAmount"
      class="plan-preview__details"
    >
      <summary>{{ t('getTs.preview.details') }}</summary>
      <p v-if="purpose === 'xor' && result.state === 'ready' && source !== 'xor'">
        {{ t('buyXor.preview.netXor') }}
      </p>
      <p v-if="purpose === 'ts' && result.state === 'ready' && result.burnableXor !== undefined">
        {{ t('getTs.preview.burnable', { xor: display(result.burnableXor) }) }}
      </p>
      <p v-if="result.costCoverage === 'partial'">{{ t('getTs.preview.additionalGas') }}</p>
      <p v-if="result.paymentEthAmount">
        {{
          t(purpose === 'xor' ? 'buyXor.preview.cardEth' : 'getTs.preview.cardEth', {
            eth: display(result.paymentEthAmount, 8),
          })
        }}
      </p>
      <p v-if="result.daiAmount">
        {{
          t('getTs.preview.dai', {
            amount: display(result.daiAmount),
            minimum: display(result.daiIntent ?? result.daiAmount),
          })
        }}
      </p>
      <ul v-if="result.feeComponents.length">
        <li v-for="(fee, index) in result.feeComponents" :key="index">
          {{ t(`getTs.preview.fee.${fee.stage}`) }}: {{ display(fee.amount, 8) }} {{ fee.symbol }}
          <span v-if="!fee.included">({{ t('getTs.preview.quotedFee') }})</span>
        </li>
      </ul>
      <p v-if="result.priceImpact">{{ t('getTs.preview.impact', { impact: display(result.priceImpact, 2) }) }}</p>
      <p v-if="purpose === 'ts' && result.indexedThroughBlock">
        {{ t('getTs.preview.checkpoint', { block: result.indexedThroughBlock }) }}
      </p>
      <p v-if="source === 'ton'">{{ t('getTs.preview.tonRoute') }}</p>
      <p v-if="source === 'card'">{{ t('getTs.preview.cardTerms') }}</p>
      <p>{{ t(purpose === 'xor' ? 'buyXor.preview.method' : 'getTs.preview.method') }}</p>
    </details>
    <p class="plan-preview__claim">{{ t(purpose === 'xor' ? 'buyXor.preview.notice' : 'getTs.preview.claim') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { FPNumber } from '@sora-substrate/sdk';
import { Operation } from '@sora-substrate/sdk/build/types';
import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import type { GetTsPurpose, GetTsSource } from '@/features/misc/lib/getTsFlow';
import { findGetTsAmountSuggestion, type GetTsAmountSuggestion } from '@/features/misc/lib/getTsAmountSuggestion';
import {
  emptyGetTsPlan,
  getTsPlanAssets,
  isGetTsPlanAmount,
  requestGetTsPlanPreview,
  type GetTsPaymentAsset,
  type GetTsPlanPreviewResult,
} from '@/features/misc/lib/getTsPlanQuote';

/** Amount-first public estimates. Wallet connections and all execution remain outside this component. */
const props = withDefaults(
  defineProps<{ source: GetTsSource; amount: string; paymentAsset?: GetTsPaymentAsset; purpose?: GetTsPurpose }>(),
  { purpose: 'ts' }
);
const emit = defineEmits<{
  'update:amount': [amount: string];
  'update:paymentAsset': [asset: GetTsPaymentAsset];
  preview: [result: GetTsPlanPreviewResult];
}>();
const { t } = useTranslation();
const settings = useSettingsStore();
const id = useId();
const titleId = `get-ts-plan-title-${id}`;
const amountId = `get-ts-plan-amount-${id}`;
const assetId = `get-ts-plan-asset-${id}`;
const assets = computed(() => getTsPlanAssets(props.source));
const asset = computed(() =>
  props.paymentAsset && assets.value.includes(props.paymentAsset) ? props.paymentAsset : assets.value[0]
);
const request = computed(() => ({
  source: props.source,
  amount: props.amount,
  paymentAsset: asset.value,
  purpose: props.purpose,
}));
const result = ref<GetTsPlanPreviewResult>(emptyGetTsPlan(request.value));
const suggestion = ref<GetTsAmountSuggestion | null>(null);
const findingAmount = ref(false);
const canSuggest = computed(() =>
  ['price-impact', 'conversion-impact', 'cap-exceeded'].includes(result.value.reason ?? '')
);
const canUseMinimum = computed(
  () => result.value.reason === 'card-minimum' && isGetTsPlanAmount(result.value.providerMinimumUsd ?? '', 'USD')
);
const reasonKey = computed(() =>
  props.purpose === 'xor' && ['fees-unavailable', 'fees-insufficient'].includes(result.value.reason ?? '')
    ? `buyXor.preview.reason.${result.value.reason}`
    : `getTs.preview.reason.${result.value.reason}`
);
let timer: ReturnType<typeof setTimeout> | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let generation = 0;
let disposed = false;

/** Each estimate uses the current network fees and purpose, including while finding a smaller amount. */
function quoteDependencies(signal: AbortSignal) {
  return {
    fees: {
      swapFeeCodec: settings.networkFees?.[Operation.Swap],
      burnFeeCodec: props.purpose === 'ts' ? settings.networkFees?.[Operation.BurnWithRemark] : undefined,
      slippageTolerance: settings.slippageTolerance,
    },
    moonpayPublicKey: settings.moonpayApiKey,
    signal,
  };
}
/** Offer an explicitly chosen smaller amount; the normal preview checks it again after selection. */
async function findAmount(): Promise<void> {
  if (!canSuggest.value || findingAmount.value) return;
  const current = generation;
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const dependencies = quoteDependencies(signal);
  findingAmount.value = true;
  suggestion.value = null;
  const value = await findGetTsAmountSuggestion(
    { ...request.value },
    (candidate) => requestGetTsPlanPreview(candidate, dependencies),
    signal
  );
  if (disposed || current !== generation) return;
  findingAmount.value = false;
  suggestion.value = value;
}

/** Rounding is display-only; emitted calculations keep their original fixed-point strings. */
function display(value: string, decimals = 6): string {
  const exact = new FPNumber(value);
  const rounded = exact.dp(decimals, 3);
  return exact.gt(FPNumber.ZERO) && rounded.isZero()
    ? `<${FPNumber.ONE.div(new FPNumber('10').pow(decimals)).toString()}`
    : rounded.toString();
}
/** Publish revocation synchronously so changing input can never retain old affordability evidence. */
function publish(value: GetTsPlanPreviewResult): void {
  result.value = value;
  emit('preview', value);
}
/** Debounced reads replace old results, abort provider fetches, and refresh short-lived successful estimates. */
function restart(delay = 650): void {
  generation += 1;
  const current = generation;
  clearTimeout(timer);
  clearTimeout(expiry);
  controller?.abort();
  findingAmount.value = false;
  suggestion.value = null;
  if (disposed) return;
  if (!props.amount) {
    publish(emptyGetTsPlan(request.value));
    return;
  }
  if (!isGetTsPlanAmount(props.amount, asset.value)) {
    publish({ ...emptyGetTsPlan(request.value, 'blocked'), feasible: false, reason: 'invalid-amount' });
    return;
  }
  publish(emptyGetTsPlan(request.value, 'loading'));
  timer = setTimeout(async () => {
    controller = new AbortController();
    const value = await requestGetTsPlanPreview({ ...request.value }, quoteDependencies(controller.signal)).catch(
      () => ({ ...emptyGetTsPlan(request.value, 'unavailable'), reason: 'liquidity-unavailable' as const })
    );
    if (disposed || current !== generation) return;
    publish(value);
    if (value.state === 'ready' && value.expiresAt)
      expiry = setTimeout(() => restart(0), Math.max(0, value.expiresAt - Date.now()));
  }, delay);
}
watch(
  asset,
  (value) => {
    if (value !== props.paymentAsset) emit('update:paymentAsset', value);
  },
  { immediate: true }
);
watch(
  () => [
    props.source,
    props.purpose,
    props.amount,
    asset.value,
    settings.nodeIsConnected,
    settings.soraNetwork,
    settings.networkFees?.[Operation.Swap],
    props.purpose === 'ts' ? settings.networkFees?.[Operation.BurnWithRemark] : undefined,
    settings.slippageTolerance,
    settings.moonpayApiKey,
  ],
  () => restart(),
  { immediate: true, flush: 'sync' }
);
onBeforeUnmount(() => {
  disposed = true;
  generation += 1;
  controller?.abort();
  clearTimeout(timer);
  clearTimeout(expiry);
});
</script>

<style scoped lang="scss">
.plan-preview {
  margin-top: 24px;
  padding-top: 8px;
  h2 {
    margin: 0 0 20px;
    font-size: 20px;
  }
  p {
    margin: 10px 0;
    line-height: 1.6;
  }
  &__input {
    display: grid;
    grid-template-columns: #{'minmax(0, 1fr) 110px'};
    gap: 16px;
  }
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    font-size: 13px;
  }
  input,
  select {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 56px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    padding: 16px;
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
    color: var(--s-color-base-content-primary);
    font: inherit;
    font-size: 20px;
  }
  select:disabled {
    opacity: 1;
    color: var(--s-color-base-content-secondary);
    -webkit-text-fill-color: var(--s-color-base-content-secondary);
  }
  input:focus,
  select:focus {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 3px;
  }
  &__outcome {
    margin-top: 24px;
    padding: 16px 20px;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    overflow-wrap: anywhere;
  }
  &__label {
    font-size: 13px;
    color: var(--s-color-base-content-secondary);
  }
  p.plan-preview__input-note {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--s-color-base-content-secondary);
  }
  &__total {
    display: block;
    overflow-wrap: anywhere;
    font-size: clamp(28px, 6vw, 40px);
    line-height: 1.2;
    font-weight: 600;
  }
  &__total span {
    font-size: 0.55em;
    font-weight: 400;
  }
  &__gas,
  &__reason {
    font-size: 14px;
  }
  &__gas {
    margin-top: 20px;
    p {
      margin: 4px 0;
    }
  }
  &__details {
    margin-top: 16px;
    font-size: 13px;
    line-height: 1.6;
  }
  summary {
    box-sizing: border-box;
    min-height: 44px;
    cursor: pointer;
    padding: 12px 0;
    color: var(--s-color-action-text);
  }
  ul {
    padding-left: 20px;
  }
  &__claim {
    font-size: 12px;
    color: var(--s-color-base-content-secondary);
  }
  button {
    min-height: 44px;
    max-width: 100%;
    padding: 12px 20px;
    color: var(--s-color-action-text);
    cursor: pointer;
    border: 0;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    font: inherit;
    transition:
      box-shadow 160ms ease,
      color 160ms ease;
  }
  button:active {
    box-shadow: var(--s-shadow-element);
  }
  :is(button, summary):focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 3px;
  }
  @media (max-width: 480px) {
    &__input {
      grid-template-columns: #{'minmax(0, 1fr) 96px'};
      gap: 12px;
    }
    &__outcome {
      padding: 12px 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
}
</style>
