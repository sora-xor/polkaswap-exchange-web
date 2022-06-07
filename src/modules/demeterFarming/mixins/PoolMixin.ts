import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';

import AccountPoolMixin from './AccountPoolMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import { getter } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class PoolMixin extends Mixins(AccountPoolMixin, TranslationMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: AccountLiquidity;

  @getter.demeterFarming.tokenInfos private tokenInfos!: DataMap<DemeterRewardToken>;

  get isFarm(): boolean {
    return !!this.pool?.isFarm;
  }

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
    return FPNumber.fromCodecValue(this.poolAsset?.balance?.transferable ?? 0, this.poolAsset?.decimals);
  }

  get poolAssetBalanceFormatted(): string {
    return this.poolAssetBalance.toLocaleString();
  }

  get tokenInfo(): Nullable<DemeterRewardToken> {
    return this.tokenInfos[this.pool?.rewardAsset];
  }

  get depositFee(): number {
    return this.pool?.depositFee ?? 0;
  }

  get depositFeeFormatted(): string {
    return `${this.depositFee * 100}%`;
  }

  get funds(): FPNumber {
    return this.isFarm ? this.liqudityLP : this.poolAssetBalance;
  }

  get lockedFunds(): FPNumber {
    return this.accountPool?.pooledTokens ?? FPNumber.ZERO;
  }

  get availableFunds(): FPNumber {
    return this.isFarm ? this.funds.sub(this.lockedFunds) : this.funds;
  }

  get poolShare(): FPNumber {
    if (!this.isFarm) return this.lockedFunds;

    if (this.funds.isZero()) return FPNumber.ZERO;
    // use .min because pooled LP could be greater that liquiduty LP
    return FPNumber.min(this.lockedFunds, this.funds).div(this.funds).mul(FPNumber.HUNDRED);
  }

  get poolShareFormatted(): string {
    return this.poolShare.toLocaleString() + (this.isFarm ? '%' : '');
  }

  get poolShareText(): string {
    return this.isFarm
      ? this.t('demeterFarming.info.poolShare')
      : this.t('demeterFarming.info.stake', { symbol: this.poolAssetSymbol });
  }

  get tvl(): string {
    if (!this.pool) return '0';

    const format = (value: FPNumber) => value.dp(2).toLocaleString();

    if (this.isFarm) {
      // calc liquidty locked price through account liquidity
      const liquidityLockedPrice = FPNumber.fromCodecValue(this.liquidity.firstBalance)
        .div(this.liqudityLP)
        .mul(this.pool.totalTokensInPool)
        .mul(this.baseAssetPrice)
        .mul(new FPNumber(2));

      return format(liquidityLockedPrice);
    } else {
      const assetLockedPrice = this.pool.totalTokensInPool.mul(this.poolAssetPrice);

      return format(assetLockedPrice);
    }
  }

  get tvlFormatted(): string {
    return `$${this.tvl}`;
  }

  // allocation * token_per_block * 5256000 * multiplierPercent * reward_token_price / liquidityInPool * 100
  get apr(): FPNumber {
    if (!this.pool || (this.isFarm && !this.liquidity)) return FPNumber.ZERO;

    let liquidityInPool: FPNumber;

    if (this.isFarm) {
      const accountPoolShare = new FPNumber(this.liquidity.poolShare).div(FPNumber.HUNDRED);
      const lpTokens = this.liqudityLP.div(accountPoolShare);
      const liquidityLockedPercent = this.pool.totalTokensInPool.div(lpTokens);
      // calc pool price through account liquidity
      const wholeLiquidityPrice = FPNumber.fromCodecValue(this.liquidity.firstBalance, this.baseAsset?.decimals)
        .mul(this.baseAssetPrice)
        .mul(new FPNumber(2))
        .div(accountPoolShare);

      liquidityInPool = liquidityLockedPercent.mul(wholeLiquidityPrice);
    } else {
      // if stake is empty, show arp if user will stake all his tokens
      const liquidityTokens = this.pool.totalTokensInPool.isZero()
        ? this.poolAssetBalance
        : this.pool.totalTokensInPool;
      liquidityInPool = liquidityTokens.mul(this.poolAssetPrice);
    }

    if (liquidityInPool.isZero()) return FPNumber.ZERO;

    const allocation =
      (this.isFarm ? this.tokenInfo?.farmsAllocation : this.tokenInfo?.stakingAllocation) ?? FPNumber.ZERO;
    const tokenPerBlock = this.tokenInfo?.tokenPerBlock ?? FPNumber.ZERO;
    const blocksPerYear = new FPNumber(5_256_000);
    const poolMultiplier = new FPNumber(this.pool.multiplier);
    const tokenMultiplier = new FPNumber(
      (this.isFarm ? this.tokenInfo?.farmsTotalMultiplier : this.tokenInfo?.stakingTotalMultiplier) ?? 0
    );
    const multiplier = poolMultiplier.div(tokenMultiplier);
    const rewardTokenPrice = this.rewardAssetPrice;

    return allocation
      .mul(tokenPerBlock)
      .mul(blocksPerYear)
      .mul(multiplier)
      .mul(rewardTokenPrice)
      .div(liquidityInPool)
      .mul(FPNumber.HUNDRED);
  }

  get aprFormatted(): string {
    return this.apr.dp(2).toLocaleString() + '%';
  }
}
