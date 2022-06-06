import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';

import AccountPoolMixin from './AccountPoolMixin';

import { getter } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class PoolMixin extends Mixins(AccountPoolMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: AccountLiquidity;

  @getter.demeterFarming.tokenInfos private tokenInfos!: DataMap<DemeterRewardToken>;

  get hasStake(): boolean {
    return this.accountPool ? !this.accountPool.pooledTokens.isZero() : false;
  }

  get baseAsset(): Nullable<AccountAsset> {
    return this.getAsset(this.liquidity?.firstAddress);
  }

  get poolAsset(): Nullable<AccountAsset> {
    return this.getAsset(this.pool?.poolAsset);
  }

  get poolAssetSymbol(): string {
    return this.poolAsset?.symbol ?? '';
  }

  get poolAssetPrice(): FPNumber {
    return this.poolAsset ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.poolAsset) ?? 0) : FPNumber.ZERO;
  }

  get baseAssetPrice(): FPNumber {
    return this.baseAsset ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.baseAsset) ?? 0) : FPNumber.ZERO;
  }

  get liqudityLP(): FPNumber {
    return FPNumber.fromCodecValue(this.liquidity?.balance ?? '0');
  }

  get poolAssetBalance(): FPNumber {
    return FPNumber.fromCodecValue(this.poolAsset?.balance?.total ?? 0, this.poolAsset?.decimals);
  }

  get poolAssetBalanceFormatted(): string {
    return this.poolAssetBalance.toLocaleString();
  }

  get tokenInfo(): Nullable<DemeterRewardToken> {
    return this.tokenInfos[this.pool?.rewardAsset];
  }

  get feePercent(): string {
    return `${(this.pool?.depositFee ?? 0) * 100}%`;
  }

  get poolShareStaked(): FPNumber {
    if (!this.accountPool) return FPNumber.ZERO;

    const pooled = this.accountPool.pooledTokens;
    const total = this.liquidity ? this.liqudityLP : this.poolAssetBalance;
    const min = FPNumber.min(pooled, total);

    return min.div(total).mul(FPNumber.HUNDRED);
  }

  get poolShareStakedFormatted(): string {
    return this.poolShareStaked.toLocaleString() + '%';
  }

  get tvl(): string {
    if (!this.pool) return '0';

    const format = (value: FPNumber) => value.dp(2).toLocaleString();

    // staking tvl
    if (!this.liquidity) {
      const assetLockedPrice = this.pool.totalTokensInPool.mul(this.poolAssetPrice);

      return format(assetLockedPrice);
    } else {
      // farming tvl
      const calcTotalPrice = (balance: CodecString, price: FPNumber) => {
        return FPNumber.fromCodecValue(balance).div(this.liqudityLP).mul(this.pool.totalTokensInPool).mul(price);
      };

      const baseAssetLockedPrice = calcTotalPrice(this.liquidity.firstBalance, this.baseAssetPrice);
      const poolAssetLockedPrice = calcTotalPrice(this.liquidity.secondBalance, this.poolAssetPrice);
      const totalLockedPrice = baseAssetLockedPrice.add(poolAssetLockedPrice);

      return format(totalLockedPrice);
    }
  }

  get tvlFormatted(): string {
    return `$${this.tvl}`;
  }

  // allocation * token_per_block * 5256000 * multiplierPercent * reward_token_price / liquidityInPool * 100
  get apr(): FPNumber {
    if (!this.pool) return FPNumber.ZERO;

    const allocation =
      (this.pool.isFarm ? this.tokenInfo?.farmsAllocation : this.tokenInfo?.stakingAllocation) ?? FPNumber.ZERO;
    const tokenPerBlock = this.tokenInfo?.tokenPerBlock ?? FPNumber.ZERO;
    const blocksPerYear = new FPNumber(5_256_000);
    const multiplierPercent = new FPNumber(this.pool.multiplier);
    const rewardTokenPrice = this.rewardAssetPrice;
    // only staking
    const liquidityInPool = this.pool.totalTokensInPool.mul(this.poolAssetPrice);

    return allocation
      .mul(tokenPerBlock)
      .mul(blocksPerYear)
      .mul(multiplierPercent)
      .mul(rewardTokenPrice)
      .div(liquidityInPool)
      .mul(FPNumber.HUNDRED);
  }

  get aprFormatted(): string {
    return this.apr.dp(2).toLocaleString() + '%';
  }
}
