import { Component, Mixins } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

@Component
export default class PageMixin extends Mixins() {
  @getter.demeterFarming.farmingPools farmingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: Array<DemeterAccountPool>;
  @getter.demeterFarming.stakingPools stakingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.accountStakingPools accountStakingPools!: Array<DemeterAccountPool>;

  // override it for Staking page
  isFarmingPage = true;

  showStakeDialog = false;
  showClaimDialog = false;

  poolAsset: Nullable<string> = null;
  rewardAsset: Nullable<string> = null;

  isAddingStake = true;

  get pools(): DataMap<DemeterPool[]> {
    return this.isFarmingPage ? this.farmingPools : this.stakingPools;
  }

  get accountPools(): Array<DemeterAccountPool> {
    return this.isFarmingPage ? this.accountFarmingPools : this.accountStakingPools;
  }

  get selectedPool(): Nullable<DemeterPool> {
    if (!this.poolAsset || !this.pools[this.poolAsset]) return null;

    return this.pools[this.poolAsset].find((pool) => pool.rewardAsset === this.rewardAsset);
  }

  get selectedAccountPool(): Nullable<DemeterAccountPool> {
    const { poolAsset, rewardAsset } = this;

    return poolAsset && rewardAsset ? this.getAccountPool({ poolAsset, rewardAsset } as DemeterPool) ?? null : null;
  }

  getAccountPool(pool: DemeterPool): Nullable<DemeterAccountPool> {
    return this.accountPools.find(
      (accountPool) => accountPool.poolAsset === pool.poolAsset && accountPool.rewardAsset === pool.rewardAsset
    );
  }

  hasActivePools(address: string): boolean {
    return this.pools[address]?.some((pool) => !pool.isRemoved);
  }

  hasAccountPoolsForPoolAsset(address: string): boolean {
    return this.accountPools.some(
      (accountPool) =>
        accountPool.poolAsset === address && (!accountPool.pooledTokens.isZero() || !accountPool.rewards.isZero)
    );
  }

  getStatusBadgeVisibility(address: string, activeCollapseItems: string[]): boolean {
    const isClosedCollapseItem = !activeCollapseItems.includes(address);
    const hasActivePools = this.hasActivePools(address);
    const hasAccountPools = this.hasAccountPoolsForPoolAsset(address);

    return isClosedCollapseItem && (hasActivePools || hasAccountPools);
  }

  changePoolStake(params: { poolAsset: string; rewardAsset: string }, isAddingStake = true) {
    this.isAddingStake = isAddingStake;
    this.setDialogParams(params);
    this.showStakeDialog = true;
  }

  claimPoolRewards(params: { poolAsset: string; rewardAsset: string }) {
    this.setDialogParams(params);
    this.showClaimDialog = true;
  }

  private setDialogParams({ poolAsset, rewardAsset }: { poolAsset: string; rewardAsset: string }) {
    this.poolAsset = poolAsset;
    this.rewardAsset = rewardAsset;
  }
}
