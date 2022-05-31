import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { getter } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { DemeterAccountPool, DemeterPool } from '@/store/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component
export default class PoolInfoMixin extends Mixins(mixins.FormattedAmountMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: AccountLiquidity;
  @Prop({ default: () => null, type: Object }) readonly pool!: DemeterPool;
  @Prop({ default: () => null, type: Object }) readonly accountPool!: DemeterAccountPool;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<Asset>;

  get hasStake(): boolean {
    return this.accountPool ? !this.accountPool.pooledTokens.isZero() : false;
  }

  get baseAsset(): Nullable<Asset> {
    return this.getAsset(this.liquidity?.firstAddress);
  }

  get poolAsset(): Nullable<Asset> {
    return this.getAsset(this.liquidity?.secondAddress);
  }

  get rewardAsset(): Nullable<Asset> {
    return this.getAsset(this.pool?.rewardAsset);
  }

  get rewardAssetSymbol(): string {
    return this.rewardAsset?.symbol ?? '';
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

  get feePercent(): string {
    return `${(this.pool?.depositFee ?? 0) * 100}%`;
  }

  get poolShareStaked(): FPNumber {
    if (!this.accountPool) return FPNumber.ZERO;

    return this.accountPool.pooledTokens.div(this.liqudityLP).mul(FPNumber.HUNDRED);
  }

  get poolShareStakedFormatted(): string {
    return this.poolShareStaked.toLocaleString() + '%';
  }

  get tvl(): string {
    if (!this.liquidity || !this.pool) return '0';

    const calcTotalPrice = (balance: CodecString, price: FPNumber) => {
      return FPNumber.fromCodecValue(balance).div(this.liqudityLP).mul(this.pool.totalTokensInPool).mul(price);
    };

    const baseAssetLockedPrice = calcTotalPrice(this.liquidity.firstBalance, this.baseAssetPrice);
    const poolAssetLockedPrice = calcTotalPrice(this.liquidity.secondBalance, this.poolAssetPrice);
    const totalLockedPrice = baseAssetLockedPrice.add(poolAssetLockedPrice).dp(2).toLocaleString();

    return totalLockedPrice;
  }

  get tvlFormatted(): string {
    return `$${this.tvl}`;
  }
}
