import { FPNumber, Operation } from '@sora-substrate/sdk';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { ZeroStringValue } from '@/consts';
import { DAY_HOURS, rewardAsset, ValidatorsListMode } from '@/modules/staking/sora/consts';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useStakingStore } from '@/stores/staking';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { formatDecimalPlaces, getAssetBalance, hasInsufficientXorForFee } from '@/utils';

import type { NetworkFeesObject, CodecString } from '@sora-substrate/sdk';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type {
  AccountStakingLedger,
  MyStakingInfo,
  NominatorReward,
  Payouts,
  ValidatorInfoFull,
} from '@sora-substrate/sdk/build/staking/types';
import type { ComputedRef } from 'vue';

function asCodec(value?: CodecString | string | null): CodecString {
  return (value ?? ZeroStringValue) as CodecString;
}

export function useSoraStaking() {
  const { getAssetFiatPrice, getFiatAmountByFPNumber, formatCodecNumber } = useFormattedAmount();
  const assetsStore = useAssetsStore();
  const stakingStore = useStakingStore();

  const stakingInfo = computed(() => stakingStore.stakingInfo as Nullable<MyStakingInfo>);
  const newStakeValidatorsMode = computed(() => stakingStore.newStakeValidatorsMode);
  const minNominatorBond = computed(() => stakingStore.minNominatorBond as number);
  const unbondPeriod = computed(() => stakingStore.unbondPeriod as number);
  const stakeAmount = computed({
    get: () => stakingStore.stakeAmount,
    set: (value: string) => stakingStore.setStakeAmount(value),
  });
  const validators = computed(() => stakingStore.validatorsInfo as ValidatorInfoFull[]);
  const selectedValidators = computed({
    get: () => stakingStore.selectedValidators as ValidatorInfoFull[],
    set: (value: ValidatorInfoFull[]) => stakingStore.selectValidators(value),
  });
  const activeEra = computed(() => stakingStore.activeEra as Nullable<number>);
  const activeEraStart = computed(() => stakingStore.activeEraStart as Nullable<number>);
  const currentEra = computed(() => stakingStore.currentEra as number);
  const currentEraTotalStake = computed(() => stakingStore.currentEraTotalStake as string);
  const maxNominations = computed(() => stakingStore.maxNominations as number);
  const accountLedger = computed(() => stakingStore.accountLedger as Nullable<AccountStakingLedger>);
  const pendingRewards = computed(() => stakingStore.pendingRewards as Nullable<NominatorReward>);
  const validatorsFilter = computed({
    get: () => stakingStore.validatorsFilter,
    set: (value) => stakingStore.setValidatorsFilter(value),
  });
  const showValidatorsFilterDialog = computed({
    get: () => stakingStore.showValidatorsFilterDialog,
    set: (value: boolean) => stakingStore.setShowValidatorsFilterDialog(value),
  });
  const payee = computed(() => stakingStore.payee as string);
  const controller = computed(() => stakingStore.controller as string);
  const totalNominators = computed(() => stakingStore.totalNominators as Nullable<number>);

  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
  const networkFee: ComputedRef<CodecString> = computed(() => asCodec(networkFees.value?.[Operation.StakingBond]));
  const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));

  const xor = computed(() => assetsStore.xor as Nullable<AccountAsset>);
  const getAsset = assetsStore.assetDataByAddress as (addr?: string) => Nullable<RegisteredAccountAsset>;
  const stash = computed(() => stakingStore.stash);

  const pricesAvailable = computed(() => Object.keys(walletStore.fiatPriceObject ?? {}).length > 0);
  const stakingAsset = xor;
  const stakingAssetPrice = computed(() =>
    stakingAsset.value ? (getAssetFiatPrice(stakingAsset.value) ?? ZeroStringValue) : ZeroStringValue
  );
  const rewardAssetData = computed(() => getAsset(rewardAsset));

  const totalStaked = computed(() =>
    FPNumber.fromCodecValue(currentEraTotalStake.value, stakingAsset.value?.decimals).mul(
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
  const lockedFundsFiat = computed(() =>
    stakingAsset.value ? getFiatAmountByFPNumber(lockedFunds.value, stakingAsset.value) : null
  );

  const unlockingFunds = computed(() =>
    (accountLedger.value?.unlocking ?? []).reduce((acc, unlock) => {
      return acc.add(FPNumber.fromCodecValue(unlock.value.toString(), stakingAsset.value?.decimals));
    }, FPNumber.ZERO)
  );
  const unlockingFundsFiat = computed(() =>
    stakingAsset.value ? getFiatAmountByFPNumber(unlockingFunds.value, stakingAsset.value) : null
  );

  const nextWithdrawalEra = computed(() => {
    if (!accountLedger.value?.unlocking.length || !activeEra.value) return null;

    const countdownEras = accountLedger.value.unlocking
      .map((unlock) => unlock.era - activeEra.value!)
      .filter((value) => value > 0);

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
  const withdrawableFundsFiat = computed(() =>
    stakingAsset.value ? getFiatAmountByFPNumber(withdrawableFunds.value, stakingAsset.value) : null
  );
  const withdrawableFundsFormatted = computed(() => withdrawableFunds.value.toLocaleString());

  const rewardedFunds = computed(() => {
    if (!pendingRewards.value) return FPNumber.ZERO;

    return pendingRewards.value.reduce((acc, reward) => {
      return acc.add(new FPNumber(reward.sumRewards, rewardAssetData.value?.decimals));
    }, FPNumber.ZERO);
  });
  const rewardedFundsFiat = computed(() =>
    rewardAssetData.value ? getFiatAmountByFPNumber(rewardedFunds.value, rewardAssetData.value) : null
  );
  const rewardedFundsFormatted = computed(() => rewardedFunds.value.toLocaleString());

  const stakingInitialized = computed(() => stakingInfo.value?.totalStake !== '0');

  const stakingAssetBalance = computed(() =>
    FPNumber.fromCodecValue(getAssetBalance(stakingAsset.value) ?? ZeroStringValue, stakingAsset.value?.decimals)
  );
  const funds = stakingAssetBalance;
  const availableFunds = stakingAssetBalance;

  const isInsufficientXorForFee = computed(
    () => Boolean(stakingAsset.value) && hasInsufficientXorForFee(stakingAsset.value, networkFee.value)
  );

  const minNominatorBondFormatted = computed(() => {
    return Number(minNominatorBond.value) === 0
      ? '0'
      : formatCodecNumber(`${minNominatorBond.value}`, stakingAsset.value?.decimals);
  });

  const maxApy = computed(
    () => validators.value.reduce((max, validator) => Math.max(max, Number(validator.apy)), 0) || 0
  );

  const setValidatorsFilter = (value: typeof validatorsFilter.value) => {
    stakingStore.setValidatorsFilter(value);
  };
  const setShowValidatorsFilterDialog = (value: boolean) => {
    stakingStore.setShowValidatorsFilterDialog(value);
  };

  const nominate = () => stakingStore.nominate();
  const bondAndNominate = () => stakingStore.bondAndNominate();
  const getBondAndNominateNetworkFee = () => stakingStore.getBondAndNominateNetworkFee();
  const getNominateNetworkFee = () => stakingStore.getNominateNetworkFee();
  const bondExtra = () => stakingStore.bondExtra();
  const unbond = () => stakingStore.unbond();
  const withdraw = (value: number) => stakingStore.withdraw(value);
  const payout = (args: { payouts: Payouts; payee?: string }) => stakingStore.payout(args);
  const getPayoutNetworkFee = (args: { payouts: Payouts; payee?: string }) => stakingStore.getPayoutNetworkFee(args);
  const getPendingRewards = () => stakingStore.getPendingRewards();
  const getStakingInfo = () => stakingStore.getStakingInfo();
  const getValidatorsInfo = () => stakingStore.getValidatorsInfo();
  const getMinNominatorBond = () => stakingStore.getMinNominatorBond();
  const getUnbondPeriod = () => stakingStore.getUnbondPeriod();
  const getMaxNominations = () => stakingStore.getMaxNominations();
  const getHistoryDepth = () => stakingStore.getHistoryDepth();
  const subscribeOnActiveEra = () => stakingStore.subscribeOnActiveEra();
  const subscribeOnCurrentEra = () => stakingStore.subscribeOnCurrentEra();
  const subscribeOnController = () => stakingStore.subscribeOnController();
  const subscribeOnPayee = () => stakingStore.subscribeOnPayee();
  const subscribeOnNominations = () => stakingStore.subscribeOnNominations();
  const subscribeOnAccountLedger = () => stakingStore.subscribeOnAccountLedger();
  const subscribeOnCurrentEraTotalStake = () => stakingStore.subscribeOnCurrentEraTotalStake();
  const resetActiveEraUpdates = () => stakingStore.resetActiveEraUpdates();
  const resetCurrentEraUpdates = () => stakingStore.resetCurrentEraUpdates();
  const resetCurrentEraTotalStakeUpdates = () => stakingStore.resetCurrentEraTotalStakeUpdates();
  const resetControllerUpdates = () => stakingStore.resetControllerUpdates();
  const resetPayeeUpdates = () => stakingStore.resetPayeeUpdates();
  const resetNominationsUpdates = () => stakingStore.resetNominationsUpdates();
  const resetAccountLedgerUpdates = () => stakingStore.resetAccountLedgerUpdates();
  const setStakingInfo = (info: MyStakingInfo) => stakingStore.setStakingInfo(info);
  const setTotalNominators = (value: number) => stakingStore.setTotalNominators(value);

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
    totalNominators,
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
    setStakeAmount: (value: string) => stakingStore.setStakeAmount(value),
    setValidatorsFilter,
    setShowValidatorsFilterDialog,
    setValidatorsType: (value: ValidatorsListMode) => stakingStore.setValidatorsType(value),
    selectValidators: (value: ValidatorInfoFull[]) => stakingStore.selectValidators(value),
    setStakingInfo,
    setTotalNominators,
    nominate,
    bondAndNominate,
    getBondAndNominateNetworkFee,
    getNominateNetworkFee,
    bondExtra,
    unbond,
    withdraw,
    payout,
    getPayoutNetworkFee,
    getPendingRewards,
    getStakingInfo,
    getValidatorsInfo,
    getMinNominatorBond,
    getUnbondPeriod,
    getMaxNominations,
    getHistoryDepth,
    subscribeOnActiveEra,
    subscribeOnCurrentEra,
    subscribeOnController,
    subscribeOnPayee,
    subscribeOnNominations,
    subscribeOnAccountLedger,
    subscribeOnCurrentEraTotalStake,
    resetActiveEraUpdates,
    resetCurrentEraUpdates,
    resetCurrentEraTotalStakeUpdates,
    resetControllerUpdates,
    resetPayeeUpdates,
    resetNominationsUpdates,
    resetAccountLedgerUpdates,
  };
}

export type SoraStakingComposable = ReturnType<typeof useSoraStaking>;
