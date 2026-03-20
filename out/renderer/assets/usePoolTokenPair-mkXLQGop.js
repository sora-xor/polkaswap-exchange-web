import { e as useSettingsStore, h as computed, X as XOR, s as store, O as Operation, Z as ZeroStringValue, F as FPNumber } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
function usePoolTokenPair() {
  const { formatCodecNumber, formatStringValue } = useFormattedAmount();
  const settingsStore = useSettingsStore();
  const networkFees = computed(() => settingsStore.networkFees);
  const firstTokenValue = computed(() => store.state.addLiquidity.firstTokenValue);
  const secondTokenValue = computed(() => store.state.addLiquidity.secondTokenValue);
  const isAvailable = computed(() => store.state.addLiquidity.isAvailable);
  const firstToken = computed(() => store.getters.addLiquidity.firstToken);
  const secondToken = computed(() => store.getters.addLiquidity.secondToken);
  const price = computed(() => store.getters.addLiquidity.price);
  const priceReversed = computed(() => store.getters.addLiquidity.priceReversed);
  const networkFee = computed(() => {
    const operation = isAvailable.value ? Operation.AddLiquidity : Operation.CreatePair;
    return networkFees.value?.[operation] ?? ZeroStringValue;
  });
  const formattedFee = computed(() => formatCodecNumber(networkFee.value));
  const formattedPrice = computed(() => formatStringValue(price.value));
  const formattedPriceReversed = computed(() => formatStringValue(priceReversed.value));
  const emptyAssets = computed(() => {
    if (!(firstTokenValue.value || secondTokenValue.value)) return true;
    const first = new FPNumber(firstTokenValue.value || ZeroStringValue);
    const second = new FPNumber(secondTokenValue.value || ZeroStringValue);
    return first.isNaN() || first.isZero() || second.isNaN() || second.isZero();
  });
  return {
    XOR_SYMBOL: XOR.symbol,
    networkFees,
    firstTokenValue,
    secondTokenValue,
    isAvailable,
    firstToken,
    secondToken,
    price,
    priceReversed,
    networkFee,
    formattedFee,
    formattedPrice,
    formattedPriceReversed,
    emptyAssets
  };
}
export {
  usePoolTokenPair as u
};
