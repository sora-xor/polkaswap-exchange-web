import { Component, Mixins, Prop } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class BasePageMixin extends Mixins() {
  @Prop({ default: true, type: Boolean }) readonly isFarmingPage!: boolean;

  @getter.demeterFarming.farmingPools farmingPools!: DoubleMap<DemeterPool[]>;
  @getter.demeterFarming.stakingPools stakingPools!: DoubleMap<DemeterPool[]>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: DoubleMap<DemeterAccountPool[]>;
  @getter.demeterFarming.accountStakingPools accountStakingPools!: DoubleMap<DemeterAccountPool[]>;

  showCalculatorDialog = false;

  baseAsset: Nullable<string> = null;
  poolAsset: Nullable<string> = null;
  rewardAsset: Nullable<string> = null;
  liquidity: Nullable<AccountLiquidity> = null;

  get pools(): DoubleMap<DemeterPool[]> {
    return this.isFarmingPage ? this.farmingPools : this.stakingPools;
  }

  get accountPools(): DoubleMap<DemeterAccountPool[]> {
    return this.isFarmingPage ? this.accountFarmingPools : this.accountStakingPools;
  }

  get selectedPool(): Nullable<DemeterPool> {
    if (!this.baseAsset || !this.poolAsset || !this.pools[this.baseAsset][this.poolAsset]) return null;

    return this.pools[this.baseAsset][this.poolAsset].find((pool) => pool.rewardAsset === this.rewardAsset);
  }

  get selectedAccountPool(): Nullable<DemeterAccountPool> {
    return this.selectedPool ? this.getAccountPool(this.selectedPool) : null;
  }

  getAccountPool(pool: DemeterPool): Nullable<DemeterAccountPool> {
    return this.accountPools[pool.baseAsset]?.[pool.poolAsset]?.find(
      (accountPool) => accountPool.rewardAsset === pool.rewardAsset
    );
  }

  showPoolCalculator(params: {
    baseAsset: string;
    poolAsset: string;
    rewardAsset: string;
    liquidity?: AccountLiquidity;
  }): void {
    this.setDialogParams(params);
    this.showCalculatorDialog = true;
  }

  setDialogParams(params: {
    baseAsset: string;
    poolAsset: string;
    rewardAsset: string;
    liquidity?: AccountLiquidity;
  }): void {
    this.baseAsset = params.baseAsset;
    this.poolAsset = params.poolAsset;
    this.rewardAsset = params.rewardAsset;
    this.liquidity = params.liquidity;
  }
}
