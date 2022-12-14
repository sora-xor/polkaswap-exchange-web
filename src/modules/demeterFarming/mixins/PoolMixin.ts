import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';

import AprMixin from './AprMixin';
import AccountPoolMixin from './AccountPoolMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import { getter } from '@/store/decorators';

import { getAssetBalance, formatDecimalPlaces } from '@/utils';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class PoolMixin extends Mixins(AprMixin, AccountPoolMixin, TranslationMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: AccountLiquidity;

  @getter.demeterFarming.tokenInfos private tokenInfos!: DataMap<DemeterRewardToken>;

  get isFarm(): boolean {
    return !!this.pool?.isFarm;
  }

  get activeStatus(): boolean {
    return !this.pool?.isRemoved;
  }

  get baseAsset(): Nullable<AccountAsset> {
    return this.getAsset(this.pool?.baseAsset);
  }

  get baseAssetPrice(): FPNumber {
    return this.baseAsset ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.baseAsset) ?? 0) : FPNumber.ZERO;
  }

  get poolAsset(): Nullable<AccountAsset> {
    return this.getAsset(this.pool?.poolAsset);
  }

  get poolAssetSymbol(): string {
    return this.poolAsset?.symbol ?? '';
  }

  get poolAssetDecimals(): number {
    return this.poolAsset?.decimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get poolAssetPrice(): FPNumber {
    return this.poolAsset ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.poolAsset) ?? 0) : FPNumber.ZERO;
  }

  get poolAssetBalance(): FPNumber {
    if (!this.poolAsset) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(getAssetBalance(this.poolAsset) ?? 0, this.poolAssetDecimals);
  }

  get lpBalance(): FPNumber {
    return FPNumber.fromCodecValue(getAssetBalance(this.liquidity, { parseAsLiquidity: true }) ?? 0);
  }

  get tokenInfo(): Nullable<DemeterRewardToken> {
    return this.tokenInfos[this.pool?.rewardAsset];
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

  get tvl(): FPNumber {
    if (!this.pool) return FPNumber.ZERO;

    if (this.isFarm) {
      // calc liquidty locked price through liquidity
      return FPNumber.fromCodecValue(this.liquidity.firstBalance)
        .div(this.lpBalance)
        .mul(this.pool.totalTokensInPool)
        .mul(this.baseAssetPrice)
        .mul(new FPNumber(2));
    } else {
      return this.pool.totalTokensInPool.mul(this.poolAssetPrice);
    }
  }

  get emission(): FPNumber {
    return this.getEmission(this.pool, this.tokenInfo);
  }

  get apr(): FPNumber {
    return this.getApr(this.emission, this.tvl, this.rewardAssetPrice);
  }

  get aprFormatted(): string {
    return formatDecimalPlaces(this.apr, true);
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
