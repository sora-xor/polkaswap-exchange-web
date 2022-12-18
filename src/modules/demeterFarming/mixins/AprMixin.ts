import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { DemeterPool, DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class AprMixin extends Mixins(mixins.FormattedAmountMixin) {
  // allocation * token_per_block * multiplier
  getEmission(pool: DemeterPool, tokenInfo: Nullable<DemeterRewardToken>): FPNumber {
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

  getApr(pool: DemeterPool, tokenInfo: Nullable<DemeterRewardToken>, tvl: FPNumber): FPNumber {
    if (tvl.isZero()) return FPNumber.ZERO;

    const blocksPerYear = new FPNumber(5_256_000);
    const emission = this.getEmission(pool, tokenInfo);
    const rewardAssetPrice = FPNumber.fromCodecValue(
      this.getAssetFiatPrice({ address: pool.rewardAsset } as Asset) ?? 0
    );

    return emission.mul(blocksPerYear).mul(rewardAssetPrice).div(tvl).mul(FPNumber.HUNDRED);
  }
}
