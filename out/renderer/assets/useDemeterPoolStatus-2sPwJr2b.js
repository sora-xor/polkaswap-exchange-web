import { v as useWalletStore, h as computed, aQ as toValue, F as FPNumber, g as getAssetBalance, aR as getLiquidityBalance } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
function useDemeterPoolStatus(rawProps) {
  const liquidity = computed(() => toValue(rawProps.liquidity));
  const pool = computed(() => toValue(rawProps.pool));
  const accountPool = computed(() => toValue(rawProps.accountPool));
  const poolAsset = computed(() => toValue(rawProps.poolAsset));
  const rewardAsset = computed(() => toValue(rawProps.rewardAsset));
  const formatted = useFormattedAmount();
  const walletStore = useWalletStore();
  const fiatPriceObject = computed(() => walletStore.fiatPriceObject ?? {});
  const pricesAvailable = computed(() => Object.keys(fiatPriceObject.value ?? {}).length > 0);
  const isFarm = computed(() => Boolean(pool.value?.isFarm));
  const activeStatus = computed(() => !pool.value?.isRemoved);
  const lockedFunds = computed(() => accountPool.value?.pooledTokens ?? FPNumber.ZERO);
  const hasStake = computed(() => accountPool.value ? !lockedFunds.value.isZero() : false);
  const poolAssetBalance = computed(
    () => FPNumber.fromCodecValue(getAssetBalance(poolAsset.value) ?? 0, poolAsset.value?.decimals)
  );
  const lpBalance = computed(() => FPNumber.fromCodecValue(getLiquidityBalance(liquidity.value) ?? 0));
  const funds = computed(() => isFarm.value ? lpBalance.value : poolAssetBalance.value);
  const availableFunds = computed(
    () => isFarm.value ? FPNumber.max(lockedFunds.value, funds.value).sub(lockedFunds.value) : funds.value
  );
  const depositDisabled = computed(() => !activeStatus.value || availableFunds.value.isZero());
  const emitParams = computed(() => ({
    baseAsset: pool.value?.baseAsset ?? "",
    poolAsset: pool.value?.poolAsset ?? "",
    rewardAsset: pool.value?.rewardAsset ?? ""
  }));
  return {
    ...formatted,
    liquidity,
    pool,
    accountPool,
    poolAsset,
    rewardAsset,
    pricesAvailable,
    isFarm,
    activeStatus,
    lockedFunds,
    hasStake,
    poolAssetBalance,
    lpBalance,
    funds,
    availableFunds,
    depositDisabled,
    emitParams
  };
}
export {
  useDemeterPoolStatus as u
};
