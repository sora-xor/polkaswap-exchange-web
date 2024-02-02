import { FPNumber, Operation } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ZeroStringValue } from '@/consts';
import { action, getter, state, mutation } from '@/store/decorators';
import { getAssetBalance, hasInsufficientXorForFee, formatDecimalPlaces } from '@/utils';

import { StakingPageNames } from '../../consts';
import { DAY_HOURS, ERA_HOURS, SoraStakingPageNames, ValidatorsListMode, rewardAsset } from '../consts';
import { ValidatorsFilter } from '../types';

import type { NetworkFeesObject, CodecString } from '@sora-substrate/util';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type {
  ValidatorInfoFull,
  AccountStakingLedger,
  MyStakingInfo,
  NominatorReward,
  Payouts,
} from '@sora-substrate/util/build/staking/types';

@Component
export default class StakingMixin extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @state.staking.stakingInfo stakingInfo!: Nullable<MyStakingInfo>;
  @state.staking.newStakeValidatorsMode newStakeValidatorsMode!: ValidatorsListMode;
  @state.staking.minNominatorBond minNominatorBond!: number;
  @state.staking.unbondPeriod unbondPeriod!: number;
  @state.staking.stakeAmount stakeAmount!: string;
  @state.staking.validatorsInfo validators!: Array<ValidatorInfoFull>;
  @state.staking.selectedValidators selectedValidators!: Array<ValidatorInfoFull>;
  @state.staking.activeEra activeEra!: number;
  @state.staking.currentEra currentEra!: number;
  @state.staking.currentEraTotalStake currentEraTotalStake!: string;
  @state.staking.maxNominations maxNominations!: number;
  @state.staking.accountLedger accountLedger!: Nullable<AccountStakingLedger>;
  @state.staking.pendingRewards pendingRewards!: Nullable<NominatorReward>;
  @state.staking.validatorsFilter validatorsFilter!: ValidatorsFilter;
  @state.staking.showValidatorsFilterDialog showValidatorsFilterDialog!: boolean;
  @state.staking.payee payee!: string;
  @state.staking.controller controller!: string;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;

  @getter.staking.stash stash!: string;

  @getter.assets.xor xor!: Nullable<AccountAsset>;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  @mutation.staking.setStakeAmount setStakeAmount!: (value: string) => void;
  @mutation.staking.setValidatorsFilter setValidatorsFilter!: (value: ValidatorsFilter) => void;
  @mutation.staking.setShowValidatorsFilterDialog setShowValidatorsFilterDialog!: (value: boolean) => void;
  @mutation.staking.selectValidators selectValidators!: (validators: ValidatorInfoFull[]) => void;

  @action.staking.bond bond!: AsyncFnWithoutArgs;
  @action.staking.nominate nominate!: AsyncFnWithoutArgs;
  @action.staking.bondAndNominate bondAndNominate!: AsyncFnWithoutArgs;
  @action.staking.getBondAndNominateNetworkFee getBondAndNominateNetworkFee!: () => Promise<string>;
  @action.staking.bondExtra bondExtra!: AsyncFnWithoutArgs;
  @action.staking.unbond unbond!: AsyncFnWithoutArgs;
  @action.staking.withdraw withdraw!: (value: number) => Promise<void>;
  @action.staking.payout payout!: (args: { payouts: Payouts; payee?: string }) => Promise<string>;
  @action.staking.getPayoutNetworkFee getPayoutNetworkFee!: (args: {
    payouts: Payouts;
    payee?: string;
  }) => Promise<string>;

  @action.staking.getPendingRewards getPendingRewards!: AsyncFnWithoutArgs;

  StakingPageNames = StakingPageNames;
  SoraStakingPageNames = SoraStakingPageNames;

  // Override it component for another use case
  get networkFee(): CodecString {
    return this.networkFees[Operation.StakingBond];
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return !!this.xor && hasInsufficientXorForFee(this.xor, this.networkFee);
  }

  get pricesAvailable(): boolean {
    return Object.keys(this.fiatPriceObject).length > 0;
  }

  get stakingAsset() {
    return this.xor;
  }

  get stakingAssetPrice(): string {
    return (this.stakingAsset && this.getAssetFiatPrice(this.stakingAsset)) ?? ZeroStringValue;
  }

  get rewardAsset() {
    return this.getAsset(rewardAsset);
  }

  get totalStaked(): FPNumber {
    return FPNumber.fromCodecValue(this.currentEraTotalStake).mul(FPNumber.fromCodecValue(this.stakingAssetPrice));
  }

  get totalStakedFormatted(): string {
    return `$${formatDecimalPlaces(this.totalStaked)}`;
  }

  get lockedFunds(): FPNumber {
    if (this.accountLedger) {
      return FPNumber.fromCodecValue(this.accountLedger?.active, this.stakingAsset?.decimals);
    } else if (this.stakingInfo) {
      return new FPNumber(this.stakingInfo?.activeStake, this.stakingAsset?.decimals);
    }
    return FPNumber.ZERO;
  }

  get lockedFundsFiat(): Nullable<string> {
    return this.stakingAsset ? this.getFiatAmountByFPNumber(this.lockedFunds, this.stakingAsset) : null;
  }

  get unlockingFunds(): FPNumber {
    return (this.accountLedger?.unlocking || []).reduce((acc, unlock) => {
      return acc.add(FPNumber.fromCodecValue(unlock.value.toString(), this.stakingAsset?.decimals));
    }, FPNumber.ZERO);
  }

  get unlockingFundsFiat(): Nullable<string> {
    return this.stakingAsset ? this.getFiatAmountByFPNumber(this.unlockingFunds, this.stakingAsset) : null;
  }

  get countdownHours(): number | null {
    if (!this.accountLedger || !this.accountLedger.unlocking.length) {
      return null;
    }
    const unlockingEras = this.accountLedger.unlocking.map((u) => u.era);
    return (Math.min(...unlockingEras) - this.currentEra) * ERA_HOURS;
  }

  get countdownFormatted(): string | null {
    if (!this.countdownHours) {
      return null;
    }
    const days = Math.floor(this.countdownHours / DAY_HOURS);
    const hours = this.countdownHours - days * DAY_HOURS;
    return this.t('soraStaking.info.countdown', { days, hours });
  }

  get unbondPeriodHours(): number {
    return this.unbondPeriod * DAY_HOURS;
  }

  get unbondPeriodFormatted(): string | null {
    if (!this.unbondPeriodHours) {
      return null;
    }
    const days = Math.floor(this.unbondPeriodHours / DAY_HOURS);
    const hours = this.unbondPeriodHours - days * DAY_HOURS;
    return this.t('soraStaking.info.countdown', { days, hours });
  }

  get redeemableFunds(): FPNumber {
    return this.stakingInfo ? new FPNumber(this.stakingInfo.redeemAmount, this.stakingAsset?.decimals) : FPNumber.ZERO;
  }

  get redeemableFundsFiat(): Nullable<string> {
    return this.stakingAsset ? this.getFiatAmountByFPNumber(this.redeemableFunds, this.stakingAsset) : null;
  }

  get redeemableFundsFormatted(): string {
    return this.redeemableFunds.toLocaleString();
  }

  get rewardedFunds(): FPNumber {
    if (!this.pendingRewards) return FPNumber.ZERO;

    return this.pendingRewards?.reduce((acc, reward) => {
      return acc.add(new FPNumber(reward.sumRewards, this.rewardAsset?.decimals));
    }, FPNumber.ZERO);
  }

  get rewardedFundsFiat(): Nullable<string> {
    return this.rewardAsset ? this.getFiatAmountByFPNumber(this.rewardedFunds, this.rewardAsset) : null;
  }

  get rewardedFundsFormatted(): string {
    return this.rewardedFunds.toLocaleString();
  }

  get stakingInitialized(): boolean {
    return this.stakingInfo?.totalStake !== '0';
  }

  get stakingAssetBalance(): FPNumber {
    return FPNumber.fromCodecValue(getAssetBalance(this.stakingAsset) ?? 0, this.stakingAsset?.decimals);
  }

  get funds(): FPNumber {
    return this.stakingAssetBalance;
  }

  get availableFunds(): FPNumber {
    return this.funds;
  }

  get minNominatorBondFormatted(): string {
    return this.formatCodecNumber(`${this.minNominatorBond}`, this.stakingAsset?.decimals);
  }

  get maxApy(): number {
    return this.validators.reduce((maxAPY, validator) => Math.max(maxAPY, Number(validator.apy)), 0) || 0;
  }
}
