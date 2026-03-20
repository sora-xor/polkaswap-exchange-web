import { X as XOR, w as BalanceType, x as useNumberFormatter, F as FPNumber, h as computed, s as store } from "./index-73GArslZ.js";
function useFormattedAmount() {
  const numberFormatter = useNumberFormatter();
  const fiatPriceObject = computed(() => store.state.wallet.account.fiatPriceObject);
  const getAssetFiatPrice = (asset) => {
    if (!asset?.address) return null;
    return fiatPriceObject.value?.[asset.address] ?? null;
  };
  const getFiatBalance = (asset, type = BalanceType.Transferable) => {
    if (!asset) return null;
    const price = getAssetFiatPrice(asset);
    if (!price || !asset.balance) return null;
    return numberFormatter.getFPNumberFromCodec(asset.balance[type], asset.decimals).mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFiatAmount = (amount, asset, isCodecString = false) => {
    if (!amount && amount !== "") return null;
    if (!asset) return null;
    const price = getAssetFiatPrice(asset);
    if (!price) return null;
    const numericAmount = amount || "0";
    const factory = isCodecString ? numberFormatter.getFPNumberFromCodec : numberFormatter.getFPNumber;
    return factory(numericAmount, asset.decimals).mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFiatAmountByString = (amount, asset) => {
    if (!amount && amount !== "") return null;
    if (!asset) return null;
    const price = getAssetFiatPrice(asset);
    if (!price) return null;
    return numberFormatter.getFPNumber(amount || "0", asset.decimals).mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFPNumberFiatAmountByFPNumber = (amount, asset = XOR) => {
    if (!asset) return null;
    const price = getAssetFiatPrice(asset);
    if (!price) return null;
    return amount.mul(FPNumber.fromCodecValue(price));
  };
  const getFiatAmountByFPNumber = (amount, asset = XOR) => {
    if (!asset) return null;
    const price = getAssetFiatPrice(asset);
    if (!price) return null;
    return amount.mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFiatAmountByCodecString = (amount, asset = XOR) => getFiatAmount(amount, asset, true);
  return {
    ...numberFormatter,
    getAssetFiatPrice,
    getFiatBalance,
    getFiatAmount,
    getFiatAmountByString,
    getFiatAmountByCodecString,
    getFiatAmountByFPNumber,
    getFPNumberFiatAmountByFPNumber
  };
}
export {
  useFormattedAmount as u
};
