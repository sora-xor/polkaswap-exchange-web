import { H as useAssetsStore, e as useSettingsStore, v as useWalletStore, s as store, h as computed, O as Operation, Z as ZeroStringValue, aT as rewardAsset, F as FPNumber, aU as formatDecimalPlaces, aV as DAY_HOURS, g as getAssetBalance, aS as hasInsufficientXorForFee } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
function asCodec(value) {
  return value ?? ZeroStringValue;
}
function useSoraStaking() {
  const { getAssetFiatPrice, getFiatAmountByFPNumber, formatCodecNumber } = useFormattedAmount();
  const assetsStore = useAssetsStore();
  const stakingInfo = computed(() => store.state.staking.stakingInfo);
  const newStakeValidatorsMode = computed(() => store.state.staking.newStakeValidatorsMode);
  const minNominatorBond = computed(() => store.state.staking.minNominatorBond);
  const unbondPeriod = computed(() => store.state.staking.unbondPeriod);
  const stakeAmount = computed({
    get: () => store.state.staking.stakeAmount,
    set: (value) => store.commit.staking.setStakeAmount(value)
  });
  const validators = computed(() => store.state.staking.validatorsInfo);
  const selectedValidators = computed({
    get: () => store.state.staking.selectedValidators,
    set: (value) => store.commit.staking.selectValidators(value)
  });
  const activeEra = computed(() => store.state.staking.activeEra);
  const activeEraStart = computed(() => store.state.staking.activeEraStart);
  const currentEra = computed(() => store.state.staking.currentEra);
  const currentEraTotalStake = computed(() => store.state.staking.currentEraTotalStake);
  const maxNominations = computed(() => store.state.staking.maxNominations);
  const accountLedger = computed(() => store.state.staking.accountLedger);
  const pendingRewards = computed(() => store.state.staking.pendingRewards);
  const validatorsFilter = computed({
    get: () => store.state.staking.validatorsFilter,
    set: (value) => store.commit.staking.setValidatorsFilter(value)
  });
  const showValidatorsFilterDialog = computed({
    get: () => store.state.staking.showValidatorsFilterDialog,
    set: (value) => store.commit.staking.setShowValidatorsFilterDialog(value)
  });
  const payee = computed(() => store.state.staking.payee);
  const controller = computed(() => store.state.staking.controller);
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const networkFees = computed(() => settingsStore.networkFees);
  const networkFee = computed(() => asCodec(networkFees.value?.[Operation.StakingBond]));
  const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
  const xor = computed(() => assetsStore.xor);
  const getAsset = assetsStore.assetDataByAddress;
  const stash = computed(() => store.getters.staking.stash);
  const pricesAvailable = computed(() => Object.keys(walletStore.fiatPriceObject ?? {}).length > 0);
  const stakingAsset = xor;
  const stakingAssetPrice = computed(
    () => stakingAsset.value ? getAssetFiatPrice(stakingAsset.value) ?? ZeroStringValue : ZeroStringValue
  );
  const rewardAssetData = computed(() => getAsset(rewardAsset));
  const totalStaked = computed(
    () => FPNumber.fromCodecValue(currentEraTotalStake.value, stakingAsset.value?.decimals).mul(
      FPNumber.fromCodecValue(stakingAssetPrice.value)
    )
  );
  const totalStakedFormatted = computed(() => `$${formatDecimalPlaces(totalStaked.value)}`);
  const lockedFunds = computed(() => {
    if (accountLedger.value) {
      return FPNumber.fromCodecValue(accountLedger.value.active.toString(), stakingAsset.value?.decimals);
    }
    if (stakingInfo.value) {
      return new FPNumber(stakingInfo.value.activeStake, stakingAsset.value?.decimals);
    }
    return FPNumber.ZERO;
  });
  const lockedFundsFiat = computed(
    () => stakingAsset.value ? getFiatAmountByFPNumber(lockedFunds.value, stakingAsset.value) : null
  );
  const unlockingFunds = computed(
    () => (accountLedger.value?.unlocking ?? []).reduce((acc, unlock) => {
      return acc.add(FPNumber.fromCodecValue(unlock.value.toString(), stakingAsset.value?.decimals));
    }, FPNumber.ZERO)
  );
  const unlockingFundsFiat = computed(
    () => stakingAsset.value ? getFiatAmountByFPNumber(unlockingFunds.value, stakingAsset.value) : null
  );
  const nextWithdrawalEra = computed(() => {
    if (!accountLedger.value?.unlocking.length || !activeEra.value) return null;
    const countdownEras = accountLedger.value.unlocking.map((unlock) => unlock.era - activeEra.value).filter((value) => value > 0);
    if (!countdownEras.length) return null;
    return activeEra.value + Math.min(...countdownEras);
  });
  const unbondPeriodHours = computed(() => unbondPeriod.value * DAY_HOURS);
  const unbondPeriodFormatted = computed(() => {
    if (!unbondPeriodHours.value) return null;
    const days = Math.floor(unbondPeriodHours.value / DAY_HOURS);
    const hours = unbondPeriodHours.value - days * DAY_HOURS;
    const minutes = 0;
    return `${days}D ${hours}H ${minutes}M`;
  });
  const withdrawableFunds = computed(() => {
    if (stakingInfo.value) {
      return new FPNumber(stakingInfo.value.redeemAmount, stakingAsset.value?.decimals);
    }
    return FPNumber.ZERO;
  });
  const withdrawableFundsFiat = computed(
    () => stakingAsset.value ? getFiatAmountByFPNumber(withdrawableFunds.value, stakingAsset.value) : null
  );
  const withdrawableFundsFormatted = computed(() => withdrawableFunds.value.toLocaleString());
  const rewardedFunds = computed(() => {
    if (!pendingRewards.value) return FPNumber.ZERO;
    return pendingRewards.value.reduce((acc, reward) => {
      return acc.add(new FPNumber(reward.sumRewards, rewardAssetData.value?.decimals));
    }, FPNumber.ZERO);
  });
  const rewardedFundsFiat = computed(
    () => rewardAssetData.value ? getFiatAmountByFPNumber(rewardedFunds.value, rewardAssetData.value) : null
  );
  const rewardedFundsFormatted = computed(() => rewardedFunds.value.toLocaleString());
  const stakingInitialized = computed(() => stakingInfo.value?.totalStake !== "0");
  const stakingAssetBalance = computed(
    () => FPNumber.fromCodecValue(getAssetBalance(stakingAsset.value) ?? ZeroStringValue, stakingAsset.value?.decimals)
  );
  const funds = stakingAssetBalance;
  const availableFunds = stakingAssetBalance;
  const isInsufficientXorForFee = computed(
    () => Boolean(stakingAsset.value) && hasInsufficientXorForFee(stakingAsset.value, networkFee.value)
  );
  const minNominatorBondFormatted = computed(
    () => formatCodecNumber(`${minNominatorBond.value}`, stakingAsset.value?.decimals)
  );
  const maxApy = computed(
    () => validators.value.reduce((max, validator) => Math.max(max, Number(validator.apy)), 0) || 0
  );
  const setValidatorsFilter = (value) => {
    store.commit.staking.setValidatorsFilter(value);
  };
  const setShowValidatorsFilterDialog = (value) => {
    store.commit.staking.setShowValidatorsFilterDialog(value);
  };
  const nominate = () => store.dispatch.staking.nominate();
  const bondAndNominate = () => store.dispatch.staking.bondAndNominate();
  const getBondAndNominateNetworkFee = () => store.dispatch.staking.getBondAndNominateNetworkFee();
  const bondExtra = () => store.dispatch.staking.bondExtra();
  const unbond = () => store.dispatch.staking.unbond();
  const withdraw = (value) => store.dispatch.staking.withdraw(value);
  const payout = (args) => store.dispatch.staking.payout(args);
  const getPayoutNetworkFee = (args) => store.dispatch.staking.getPayoutNetworkFee(args);
  const getPendingRewards = () => store.dispatch.staking.getPendingRewards();
  return {
    stakingInfo,
    newStakeValidatorsMode,
    minNominatorBond,
    unbondPeriod,
    stakeAmount,
    validators,
    selectedValidators,
    activeEra,
    activeEraStart,
    currentEra,
    currentEraTotalStake,
    maxNominations,
    accountLedger,
    pendingRewards,
    validatorsFilter,
    showValidatorsFilterDialog,
    payee,
    controller,
    networkFee,
    networkFeeFormatted,
    isInsufficientXorForFee,
    pricesAvailable,
    stakingAsset,
    stakingAssetPrice,
    rewardAsset: rewardAssetData,
    totalStaked,
    totalStakedFormatted,
    lockedFunds,
    lockedFundsFiat,
    unlockingFunds,
    unlockingFundsFiat,
    nextWithdrawalEra,
    unbondPeriodHours,
    unbondPeriodFormatted,
    withdrawableFunds,
    withdrawableFundsFiat,
    withdrawableFundsFormatted,
    rewardedFunds,
    rewardedFundsFiat,
    rewardedFundsFormatted,
    stakingInitialized,
    stakingAssetBalance,
    funds,
    availableFunds,
    minNominatorBondFormatted,
    maxApy,
    formatCodecNumber,
    stash,
    xor,
    getAsset,
    setStakeAmount: (value) => store.commit.staking.setStakeAmount(value),
    setValidatorsFilter,
    setShowValidatorsFilterDialog,
    setValidatorsType: (value) => store.commit.staking.setValidatorsType(value),
    selectValidators: (value) => store.commit.staking.selectValidators(value),
    nominate,
    bondAndNominate,
    getBondAndNominateNetworkFee,
    bondExtra,
    unbond,
    withdraw,
    payout,
    getPayoutNetworkFee,
    getPendingRewards
  };
}
export {
  useSoraStaking as u
};
