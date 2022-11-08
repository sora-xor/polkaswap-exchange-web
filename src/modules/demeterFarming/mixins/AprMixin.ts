import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { DemeterPool, DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class AprMixin extends Mixins(mixins.FormattedAmountMixin) {
  // allocation * token_per_block * multiplier
  getEmission(pool: DemeterPool, tokenInfo: DemeterRewardToken): FPNumber {
    const isFarm = !!pool?.isFarm;
    const allocation = (isFarm ? tokenInfo?.farmsAllocation : tokenInfo?.stakingAllocation) ?? FPNumber.ZERO;
    const tokenPerBlock = tokenInfo?.tokenPerBlock ?? FPNumber.ZERO;
    const poolMultiplier = new FPNumber(pool.multiplier);
    const tokenMultiplier = new FPNumber(
      (isFarm ? tokenInfo?.farmsTotalMultiplier : tokenInfo?.stakingTotalMultiplier) ?? 0
    );
    const multiplier = poolMultiplier.div(tokenMultiplier);

    return allocation.mul(tokenPerBlock).mul(multiplier);
  }

  async getLiquidityInPool(pool: DemeterPool): Promise<FPNumber> {
    const poolAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice({ address: pool.poolAsset } as Asset) ?? 0);

    if (pool.isFarm) {
      const poolInfo = api.poolXyk.getInfo(XOR.address, pool.poolAsset);

      if (!poolInfo) return FPNumber.ZERO;

      const poolTotalSupply = new FPNumber(await api.api.query.poolXYK.totalIssuances(poolInfo.address));

      const poolReserves = await api.poolXyk.getReserves(XOR.address, pool.poolAsset);
      const poolAssetReserves = FPNumber.fromCodecValue(poolReserves[1]);
      const poolTokenPrice = poolAssetReserves.mul(poolAssetPrice).mul(new FPNumber(2)).div(poolTotalSupply);

      return pool.totalTokensInPool.mul(poolTokenPrice);
    } else {
      return pool.totalTokensInPool.mul(poolAssetPrice);
    }
  }

  getApr(pool: DemeterPool, tokenInfo: DemeterRewardToken, liquidityInPool: FPNumber): FPNumber {
    if (liquidityInPool.isZero()) return FPNumber.ZERO;

    const blocksPerYear = new FPNumber(5_256_000);
    const emission = this.getEmission(pool, tokenInfo);
    const rewardAssetPrice = FPNumber.fromCodecValue(
      this.getAssetFiatPrice({ address: pool.rewardAsset } as Asset) ?? 0
    );

    return emission.mul(blocksPerYear).mul(rewardAssetPrice).div(liquidityInPool).mul(FPNumber.HUNDRED);
  }
}
