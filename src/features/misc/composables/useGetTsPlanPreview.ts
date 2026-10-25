import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { FPNumber } from '@sora-substrate/sdk';
import { Operation } from '@sora-substrate/sdk/build/types';
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

export interface GetTsPlanPreviewOptions {
  source: MaybeRefOrGetter<GetTsSource>;
  amount: MaybeRefOrGetter<string>;
  paymentAsset: MaybeRefOrGetter<GetTsPaymentAsset | undefined>;
  purpose: MaybeRefOrGetter<GetTsPurpose>;
  /** Receives every result synchronously, including the revocation published when the input changes. */
  onPreview: (result: GetTsPlanPreviewResult) => void;
  /** Called when the selected asset is not supported by the source and falls back to its first asset. */
  onPaymentAsset: (asset: GetTsPaymentAsset) => void;
}

/** Rounding is display-only; emitted calculations keep their original fixed-point strings. */
export function displayGetTsAmount(value: string, decimals = 6): string {
  const exact = new FPNumber(value);
  const rounded = exact.dp(decimals, 3);
  return exact.gt(FPNumber.ZERO) && rounded.isZero()
    ? `<${FPNumber.ONE.div(new FPNumber('10').pow(decimals)).toString()}`
    : rounded.toString();
}

/**
 * Amount-first public estimates shared by the Get TS plan preview and the Buy XOR start screen.
 * Debounces input, aborts stale provider reads, refreshes expiring results and never touches a wallet.
 * Call it from a component's `setup`: it registers watchers and an unmount cleanup.
 */
export function useGetTsPlanPreview(options: GetTsPlanPreviewOptions) {
  const settings = useSettingsStore();
  const assets = computed(() => getTsPlanAssets(toValue(options.source)));
  const asset = computed(() => {
    const selected = toValue(options.paymentAsset);
    return selected && assets.value.includes(selected) ? selected : assets.value[0];
  });
  const request = computed(() => ({
    source: toValue(options.source),
    amount: toValue(options.amount),
    paymentAsset: asset.value,
    purpose: toValue(options.purpose),
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
        burnFeeCodec: toValue(options.purpose) === 'ts' ? settings.networkFees?.[Operation.BurnWithRemark] : undefined,
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
  /** Publish revocation synchronously so changing input can never retain old affordability evidence. */
  function publish(value: GetTsPlanPreviewResult): void {
    result.value = value;
    options.onPreview(value);
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
    if (!request.value.amount) {
      publish(emptyGetTsPlan(request.value));
      return;
    }
    if (!isGetTsPlanAmount(request.value.amount, asset.value)) {
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
      if (value !== toValue(options.paymentAsset)) options.onPaymentAsset(value);
    },
    { immediate: true }
  );
  watch(
    () => [
      toValue(options.source),
      toValue(options.purpose),
      toValue(options.amount),
      asset.value,
      settings.nodeIsConnected,
      settings.soraNetwork,
      settings.networkFees?.[Operation.Swap],
      toValue(options.purpose) === 'ts' ? settings.networkFees?.[Operation.BurnWithRemark] : undefined,
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
  return { assets, asset, result, suggestion, findingAmount, canSuggest, canUseMinimum, findAmount, restart };
}
