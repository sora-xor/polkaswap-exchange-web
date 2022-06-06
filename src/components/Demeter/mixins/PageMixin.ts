import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { action, getter } from '@/store/decorators';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';
@Component
export default class PageMixin extends Mixins(mixins.TransactionMixin) {
  @getter.demeterFarming.farmingPools farmingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.stakingPools stakingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: DataMap<DemeterAccountPool[]>;
  @getter.demeterFarming.accountStakingPools accountStakingPools!: DataMap<DemeterAccountPool[]>;

  @action.demeterFarming.deposit deposit!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.withdraw withdraw!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.claimRewards private claimRewards!: (pool: DemeterAccountPool) => Promise<void>;

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

  get accountPools(): DataMap<DemeterAccountPool[]> {
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
    return this.accountPools[pool.poolAsset]?.find((accountPool) => accountPool.rewardAsset === pool.rewardAsset);
  }

  hasActivePools(address: string): boolean {
    return this.pools[address]?.some((pool) => !pool.isRemoved);
  }

  hasAccountPoolsForPoolAsset(address: string): boolean {
    return this.accountPools[address]?.some(
      (accountPool) => !accountPool.pooledTokens.isZero() || !accountPool.rewards.isZero
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

  async handleStakeAction(
    params: DemeterLiquidityParams,
    action: (params: DemeterLiquidityParams) => Promise<void>
  ): Promise<void> {
    await this.withNotifications(async () => {
      await action(params);
      this.showStakeDialog = false;
    });
  }

  async handleClaimRewards(pool: DemeterAccountPool): Promise<void> {
    await this.withNotifications(async () => {
      await this.claimRewards(pool);
      this.showClaimDialog = false;
    });
  }
}
