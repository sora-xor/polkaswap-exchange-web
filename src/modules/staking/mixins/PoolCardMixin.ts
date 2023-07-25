import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import type { StakingAsset } from '@/modules/staking/types';
import { getter, state } from '@/store/decorators';
import { hasInsufficientXorForFee } from '@/utils';

import PoolStatusMixin from './PoolStatusMixin';

import type { NetworkFeesObject, CodecString } from '@sora-substrate/util';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class PoolCardMixin extends Mixins(PoolStatusMixin) {
  @Prop({ default: () => null, type: Object }) readonly baseAsset!: StakingAsset;
  @Prop({ default: () => '', type: String }) readonly tvl!: string;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;

  @getter.assets.xor xor!: Nullable<AccountAsset>;

  // Override it component for another use case
  get networkFee(): CodecString {
    return this.networkFees[Operation.DemeterFarmingGetRewards];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return !!this.xor && hasInsufficientXorForFee(this.xor, this.networkFee);
  }

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get rewardAssetSymbol(): string {
    return this.rewardAsset?.symbol ?? '';
  }

  get rewards(): FPNumber {
    return this.accountPool?.rewards ?? FPNumber.ZERO;
  }

  get rewardsFormatted(): string {
    return this.rewards.toLocaleString();
  }

  get rewardAssetPrice(): FPNumber {
    return this.rewardAsset?.price ?? FPNumber.ZERO;
  }

  get rewardsFiat(): Nullable<string> {
    if (!this.rewardAsset) return null;
    return this.getFiatAmountByFPNumber(this.rewards, this.rewardAsset as Asset);
  }

  get hasRewards(): boolean {
    return !this.rewards.isZero();
  }

  get poolAssetSymbol(): string {
    return this.poolAsset?.symbol ?? '';
  }

  get poolAssetPrice(): FPNumber {
    return this.poolAsset?.price ?? FPNumber.ZERO;
  }

  get depositFee(): number {
    return this.pool?.depositFee ?? 0;
  }

  get depositFeeFormatted(): string {
    return `${this.depositFee * 100}%`;
  }

  get poolShare(): FPNumber {
    if (!this.isFarm) return this.lockedFunds;

    if (this.funds.isZero()) return FPNumber.ZERO;
    // use .min because pooled LP could be greater that liquiduty LP
    return (FPNumber.min(this.lockedFunds, this.funds) as FPNumber).div(this.funds).mul(FPNumber.HUNDRED);
  }

  get poolShareFormatted(): string {
    return this.poolShare.toLocaleString() + (this.isFarm ? '%' : '');
  }

  get poolShareFiat(): Nullable<string> {
    if (this.isFarm) return null;

    return this.getFiatAmountByFPNumber(this.poolShare, this.poolAsset as unknown as AccountAsset);
  }

  get poolShareText(): string {
    return this.isFarm
      ? this.t('demeterFarming.info.poolShare')
      : this.t('demeterFarming.info.stake', { symbol: this.poolAssetSymbol });
  }

  remove(): void {
    this.$emit('remove', this.emitParams);
  }

  claim(): void {
    this.$emit('claim', this.emitParams);
  }

  calculator(): void {
    this.$emit('calculator', this.emitParams);
  }
}
