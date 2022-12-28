import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';

const BLOCKS_PER_YEAR = new FPNumber(5_256_000);

@Component
export default class AprMixin extends Mixins(mixins.FormattedAmountMixin) {
  // allocation * token_per_block * multiplier
  getEmission(pool: DemeterPool, tokenInfo: Nullable<DemeterRewardToken>): FPNumber {
    const isFarm = !!pool?.isFarm;
    const tokenMultiplier = new FPNumber(
      (isFarm ? tokenInfo?.farmsTotalMultiplier : tokenInfo?.stakingTotalMultiplier) ?? 0
    );
    if (tokenMultiplier.isZero()) return FPNumber.ZERO;
    const poolMultiplier = new FPNumber(pool?.multiplier ?? 0);
    const multiplier = poolMultiplier.div(tokenMultiplier);
    const allocation = (isFarm ? tokenInfo?.farmsAllocation : tokenInfo?.stakingAllocation) ?? FPNumber.ZERO;
    const tokenPerBlock = tokenInfo?.tokenPerBlock ?? FPNumber.ZERO;

    return allocation.mul(tokenPerBlock).mul(multiplier);
  }

  getApr(emission: FPNumber, tvl: FPNumber, rewardAssetPrice: FPNumber): FPNumber {
    if (tvl.isZero()) return FPNumber.ZERO;

    return emission.mul(BLOCKS_PER_YEAR).mul(rewardAssetPrice).div(tvl).mul(FPNumber.HUNDRED);
  }

  getTvl(pool: DemeterPool, poolAssetPrice: FPNumber, liquidity?: Nullable<AccountLiquidity>): FPNumber {
    if (!pool) return FPNumber.ZERO;

    if (pool.isFarm) {
      if (!liquidity) return FPNumber.ZERO;

      // calc liquidity locked price through liquidity
      return FPNumber.fromCodecValue(liquidity.secondBalance)
        .div(FPNumber.fromCodecValue(liquidity.balance))
        .mul(pool.totalTokensInPool)
        .mul(poolAssetPrice)
        .mul(new FPNumber(2));
    } else {
      return pool.totalTokensInPool.mul(poolAssetPrice);
    }
  }
}
