import { FPNumber, Operation } from '@sora-substrate/sdk';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { ZeroStringValue } from '@/consts';
import { DAY_HOURS, rewardAsset, ValidatorsListMode } from '@/modules/staking/sora/consts';
import store from '@/store';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
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

  const stakingInfo = computed(() => store.state.staking.stakingInfo as Nullable<MyStakingInfo>);
  const newStakeValidatorsMode = computed(() => store.state.staking.newStakeValidatorsMode);
  const minNominatorBond = computed(() => store.state.staking.minNominatorBond as number);
  const unbondPeriod = computed(() => store.state.staking.unbondPeriod as number);
  const stakeAmount = computed({
    get: () => store.state.staking.stakeAmount,
    set: (value: string) => store.commit.staking.setStakeAmount(value),
  });
  const validators = computed(() => store.state.staking.validatorsInfo as ValidatorInfoFull[]);
  const selectedValidators = computed({
    get: () => store.state.staking.selectedValidators as ValidatorInfoFull[],
    set: (value: ValidatorInfoFull[]) => store.commit.staking.selectValidators(value),
  });
  const activeEra = computed(() => store.state.staking.activeEra as Nullable<number>);
  const activeEraStart = computed(() => store.state.staking.activeEraStart as Nullable<number>);
  const currentEra = computed(() => store.state.staking.currentEra as number);
  const currentEraTotalStake = computed(() => store.state.staking.currentEraTotalStake as string);
  const maxNominations = computed(() => store.state.staking.maxNominations as number);
  const accountLedger = computed(() => store.state.staking.accountLedger as Nullable<AccountStakingLedger>);
  const pendingRewards = computed(() => store.state.staking.pendingRewards as Nullable<NominatorReward>);
  const validatorsFilter = computed({
    get: () => store.state.staking.validatorsFilter,
    set: (value) => store.commit.staking.setValidatorsFilter(value),
  });
  const showValidatorsFilterDialog = computed({
    get: () => store.state.staking.showValidatorsFilterDialog,
    set: (value: boolean) => store.commit.staking.setShowValidatorsFilterDialog(value),
  });
  const payee = computed(() => store.state.staking.payee as string);
  const controller = computed(() => store.state.staking.controller as string);

  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
  const networkFee: ComputedRef<CodecString> = computed(() => asCodec(networkFees.value?.[Operation.StakingBond]));
  const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));

  const xor = computed(() => assetsStore.xor as Nullable<AccountAsset>);
  const getAsset = assetsStore.assetDataByAddress as (addr?: string) => Nullable<RegisteredAccountAsset>;
  const stash = computed(() => store.getters.staking.stash as string);

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

  const minNominatorBondFormatted = computed(() =>
    formatCodecNumber(`${minNominatorBond.value}`, stakingAsset.value?.decimals)
  );

  const maxApy = computed(
    () => validators.value.reduce((max, validator) => Math.max(max, Number(validator.apy)), 0) || 0
  );

  const setValidatorsFilter = (value: typeof validatorsFilter.value) => {
    store.commit.staking.setValidatorsFilter(value);
  };
  const setShowValidatorsFilterDialog = (value: boolean) => {
    store.commit.staking.setShowValidatorsFilterDialog(value);
  };

  const nominate = () => store.dispatch.staking.nominate();
  const bondAndNominate = () => store.dispatch.staking.bondAndNominate();
  const getBondAndNominateNetworkFee = () => store.dispatch.staking.getBondAndNominateNetworkFee();
  const bondExtra = () => store.dispatch.staking.bondExtra();
  const unbond = () => store.dispatch.staking.unbond();
  const withdraw = (value: number) => store.dispatch.staking.withdraw(value);
  const payout = (args: { payouts: Payouts; payee?: string }) => store.dispatch.staking.payout(args);
  const getPayoutNetworkFee = (args: { payouts: Payouts; payee?: string }) =>
    store.dispatch.staking.getPayoutNetworkFee(args);
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
    setStakeAmount: (value: string) => store.commit.staking.setStakeAmount(value),
    setValidatorsFilter,
    setShowValidatorsFilterDialog,
    setValidatorsType: (value: ValidatorsListMode) => store.commit.staking.setValidatorsType(value),
    selectValidators: (value: ValidatorInfoFull[]) => store.commit.staking.selectValidators(value),
    nominate,
    bondAndNominate,
    getBondAndNominateNetworkFee,
    bondExtra,
    unbond,
    withdraw,
    payout,
    getPayoutNetworkFee,
    getPendingRewards,
  };
}

export type SoraStakingComposable = ReturnType<typeof useSoraStaking>;
