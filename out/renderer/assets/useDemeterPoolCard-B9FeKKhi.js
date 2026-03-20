import { e as useSettingsStore, H as useAssetsStore, h as computed, Z as ZeroStringValue, O as Operation, aS as hasInsufficientXorForFee, F as FPNumber } from "./index-73GArslZ.js";
function useDemeterPoolCard(statusApi) {
  const settingsStore = useSettingsStore();
  const assetsStore = useAssetsStore();
  const networkFees = computed(() => settingsStore.networkFees);
  const xor = computed(() => assetsStore.xor);
  const networkFee = computed(
    () => networkFees.value?.[Operation.DemeterFarmingGetRewards] ?? ZeroStringValue
  );
  const networkFeeFormatted = computed(() => statusApi.formatCodecNumber(networkFee.value));
  const isInsufficientXorForFee = computed(
    () => Boolean(xor.value) && hasInsufficientXorForFee(xor.value, networkFee.value)
  );
  const rewardAssetSymbol = computed(() => statusApi.rewardAsset.value?.symbol ?? "");
  const rewardAssetPrice = computed(() => statusApi.rewardAsset.value?.price ?? FPNumber.ZERO);
  const rewards = computed(() => statusApi.accountPool.value?.rewards ?? FPNumber.ZERO);
  const rewardsFormatted = computed(() => rewards.value.toLocaleString());
  const rewardsFiat = computed(() => {
    const rewardAsset = statusApi.rewardAsset.value;
    if (!rewardAsset) return null;
    return statusApi.getFiatAmountByFPNumber(rewards.value, rewardAsset);
  });
  const hasRewards = computed(() => !rewards.value.isZero());
  const poolAssetSymbol = computed(() => statusApi.poolAsset.value?.symbol ?? "");
  const poolAssetPrice = computed(() => statusApi.poolAsset.value?.price ?? FPNumber.ZERO);
  const depositFee = computed(() => statusApi.pool.value?.depositFee ?? 0);
  const depositFeeFormatted = computed(() => `${depositFee.value * 100}%`);
  const poolShare = computed(() => {
    if (!statusApi.isFarm.value) return statusApi.lockedFunds.value;
    if (statusApi.funds.value.isZero()) return FPNumber.ZERO;
    return FPNumber.min(statusApi.lockedFunds.value, statusApi.funds.value).div(statusApi.funds.value).mul(FPNumber.HUNDRED);
  });
  const poolShareFormatted = computed(() => `${poolShare.value.toLocaleString()}${statusApi.isFarm.value ? "%" : ""}`);
  const poolShareFiat = computed(() => {
    if (statusApi.isFarm.value) return null;
    const asset = statusApi.poolAsset.value;
    if (!asset) return null;
    return statusApi.getFiatAmountByFPNumber(poolShare.value, asset);
  });
  const poolShareTextArgs = computed(() => ({
    symbol: poolAssetSymbol.value
  }));
  return {
    xor,
    networkFee,
    networkFeeFormatted,
    isInsufficientXorForFee,
    rewardAssetSymbol,
    rewardAssetPrice,
    rewards,
    rewardsFormatted,
    rewardsFiat,
    poolAssetSymbol,
    poolAssetPrice,
    depositFee,
    depositFeeFormatted,
    poolShare,
    poolShareFormatted,
    poolShareFiat,
    poolShareTextArgs,
    hasRewards
  };
}
export {
  useDemeterPoolCard as u
};
