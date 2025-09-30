import { computed } from 'vue';

import { useSwapStore } from '@/stores/swap';
import { asZeroValue } from '@/utils';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

/**
 * Aggregates swap amount helpers formerly mixed in via `SwapAmountsMixin`.
 */
export function useSwapAmounts() {
  const swapStore = useSwapStore();

  const tokenFrom = computed(() => swapStore.tokenFrom as Nullable<AccountAsset>);
  const tokenTo = computed(() => swapStore.tokenTo as Nullable<AccountAsset>);
  const fromValue = computed(() => swapStore.fromValue);
  const toValue = computed(() => swapStore.toValue);

  const areTokensSelected = computed(() => !!(tokenFrom.value && tokenTo.value));
  const isZeroFromAmount = computed(() => asZeroValue(fromValue.value));
  const isZeroToAmount = computed(() => asZeroValue(toValue.value));
  const hasZeroAmount = computed(() => isZeroFromAmount.value || isZeroToAmount.value);
  const areZeroAmounts = computed(() => isZeroFromAmount.value && isZeroToAmount.value);

  return {
    tokenFrom,
    tokenTo,
    fromValue,
    toValue,
    areTokensSelected,
    isZeroFromAmount,
    isZeroToAmount,
    hasZeroAmount,
    areZeroAmounts,
    setTokenFromAddress: swapStore.setTokenFromAddress,
    setTokenToAddress: swapStore.setTokenToAddress,
    setFromValue: swapStore.setFromValue,
    setToValue: swapStore.setToValue,
  };
}

export type SwapAmountsComposable = ReturnType<typeof useSwapAmounts>;
