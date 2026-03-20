import { I as storeToRefs, a9 as ref, ab as getCurrentScope, ac as onScopeDispose, h as computed, ad as asZeroValue } from "./index-73GArslZ.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
function useSwapAmounts() {
  const swapStore = useSwapStore();
  const { fromValue, toValue } = storeToRefs(swapStore);
  const tokenFrom = ref(swapStore.tokenFrom ?? null);
  const tokenTo = ref(swapStore.tokenTo ?? null);
  const unsubscribe = swapStore.$subscribe(
    (_mutation, state) => {
      tokenFrom.value = state.tokenFromCache ?? null;
      tokenTo.value = state.tokenToCache ?? null;
    },
    { detached: true }
  );
  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe();
    });
  }
  const tokenFromComputed = computed(() => tokenFrom.value);
  const tokenToComputed = computed(() => tokenTo.value);
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
    setToValue: swapStore.setToValue
  };
}
export {
  useSwapAmounts as u
};
