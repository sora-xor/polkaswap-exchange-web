import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber, Operation } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import { getter, state } from '@/store/decorators';
import { hasInsufficientXorForFee, getAssetBalance } from '@/utils';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { NetworkFeesObject, CodecString } from '@sora-substrate/util';

import type { DemeterAsset } from '@/modules/demeterFarming/types';

@Component
export default class AccountPoolMixin extends Mixins(mixins.FormattedAmountMixin, mixins.TranslationMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: AccountLiquidity;
  @Prop({ default: () => null, type: Object }) readonly pool!: DemeterPool;
  @Prop({ default: () => null, type: Object }) readonly accountPool!: DemeterAccountPool;
  @Prop({ default: () => null, type: Object }) readonly baseAsset!: DemeterAsset;
  @Prop({ default: () => null, type: Object }) readonly poolAsset!: DemeterAsset;
  @Prop({ default: () => null, type: Object }) readonly rewardAsset!: DemeterAsset;
  @Prop({ default: () => '', type: String }) readonly tvl!: string;
  @Prop({ default: () => '', type: String }) readonly apr!: string;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;

  @getter.assets.xor xor!: Nullable<AccountAsset>;

  get pricesAvailable(): boolean {
    return Object.keys(this.fiatPriceAndApyObject).length > 0;
  }

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

  get lockedFunds(): FPNumber {
    return this.accountPool?.pooledTokens ?? FPNumber.ZERO;
  }

  get hasStake(): boolean {
    return this.accountPool ? !this.lockedFunds.isZero() : false;
  }

  get isFarm(): boolean {
    return !!this.pool?.isFarm;
  }

  get activeStatus(): boolean {
    return !this.pool?.isRemoved;
  }

  get poolAssetSymbol(): string {
    return this.poolAsset?.symbol ?? '';
  }

  get poolAssetPrice(): FPNumber {
    return this.poolAsset?.price ?? FPNumber.ZERO;
  }

  get poolAssetBalance(): FPNumber {
    return FPNumber.fromCodecValue(getAssetBalance(this.poolAsset) ?? 0, this.poolAsset?.decimals);
  }

  get lpBalance(): FPNumber {
    return FPNumber.fromCodecValue(getAssetBalance(this.liquidity, { parseAsLiquidity: true }) ?? 0);
  }

  get depositFee(): number {
    return this.pool?.depositFee ?? 0;
  }

  get funds(): FPNumber {
    return this.isFarm ? this.lpBalance : this.poolAssetBalance;
  }

  get availableFunds(): FPNumber {
    return this.isFarm ? (FPNumber.max(this.lockedFunds, this.funds) as FPNumber).sub(this.lockedFunds) : this.funds;
  }

  get depositDisabled(): boolean {
    return !this.activeStatus || this.availableFunds.isZero();
  }

  get emitParams(): object {
    return {
      baseAsset: this.pool.baseAsset,
      poolAsset: this.pool.poolAsset,
      rewardAsset: this.pool.rewardAsset,
    };
  }

  add(): void {
    this.$emit('add', this.emitParams);
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
