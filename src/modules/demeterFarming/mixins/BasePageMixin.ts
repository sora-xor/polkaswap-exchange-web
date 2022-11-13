import { Component, Mixins, Prop } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class BasePageMixin extends Mixins() {
  @Prop({ default: true, type: Boolean }) readonly isFarmingPage!: boolean;

  @getter.demeterFarming.farmingPools farmingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.stakingPools stakingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: DataMap<DemeterAccountPool[]>;
  @getter.demeterFarming.accountStakingPools accountStakingPools!: DataMap<DemeterAccountPool[]>;

  showCalculatorDialog = false;

  poolAsset: Nullable<string> = null;
  rewardAsset: Nullable<string> = null;
  liquidity: Nullable<AccountLiquidity> = null;

  get pools(): DataMap<DemeterPool[]> {
    return this.isFarmingPage ? this.farmingPools : this.stakingPools;
  }

  get accountPools(): DataMap<DemeterAccountPool[]> {
    return this.isFarmingPage ? this.accountFarmingPools : this.accountStakingPools;
  }

  get selectedPool(): Nullable<DemeterPool> {
    if (!this.poolAsset || !this.pools[this.poolAsset]) return null;

    return this.pools[this.poolAsset].find((pool) => pool.rewardAsset === this.rewardAsset);
  }

  get selectedAccountPool(): Nullable<DemeterAccountPool> {
    return this.selectedPool ? this.getAccountPool(this.selectedPool) : null;
  }

  getAccountPool(pool: DemeterPool): Nullable<DemeterAccountPool> {
    return this.accountPools[pool.poolAsset]?.find((accountPool) => accountPool.rewardAsset === pool.rewardAsset);
  }

  showPoolCalculator(params: { poolAsset: string; rewardAsset: string; liquidity?: AccountLiquidity }): void {
    this.setDialogParams(params);
    this.showCalculatorDialog = true;
  }

  setDialogParams(params: { poolAsset: string; rewardAsset: string; liquidity?: AccountLiquidity }): void {
    this.poolAsset = params.poolAsset;
    this.rewardAsset = params.rewardAsset;
    this.liquidity = params.liquidity;
  }
}
