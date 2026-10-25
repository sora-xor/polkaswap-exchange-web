import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import { storeToRefs } from 'pinia';

import { asZeroValue } from '@/utils';

import { useSwapStore } from '../stores/useSwapStore';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

/**
 * Swap-owned amount helpers shared by the migrated feature runtime.
 */
export function useSwapAmounts() {
  const swapStore = useSwapStore();
  const { fromValue, toValue } = storeToRefs(swapStore);

  const tokenFrom = ref<Nullable<AccountAsset>>(swapStore.tokenFrom ?? null);
  const tokenTo = ref<Nullable<AccountAsset>>(swapStore.tokenTo ?? null);

  const unsubscribe = swapStore.$subscribe(
    (_mutation, state) => {
      tokenFrom.value = (state.tokenFromCache as Nullable<AccountAsset>) ?? null;
      tokenTo.value = (state.tokenToCache as Nullable<AccountAsset>) ?? null;
    },
    { detached: true }
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe();
    });
  }

  const tokenFromComputed = computed<Nullable<AccountAsset>>(() => tokenFrom.value);
  const tokenToComputed = computed<Nullable<AccountAsset>>(() => tokenTo.value);

  const areTokensSelected = computed(() => !!(tokenFrom.value && tokenTo.value));
  const isZeroFromAmount = computed(() => asZeroValue(fromValue.value));
  const isZeroToAmount = computed(() => asZeroValue(toValue.value));
  const hasZeroAmount = computed(() => isZeroFromAmount.value || isZeroToAmount.value);
  const areZeroAmounts = computed(() => isZeroFromAmount.value && isZeroToAmount.value);

  return {
    tokenFrom: tokenFromComputed,
    tokenTo: tokenToComputed,
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
