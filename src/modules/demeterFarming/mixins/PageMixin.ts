import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { action, getter } from '@/store/decorators';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';
@Component
export default class PageMixin extends Mixins(mixins.TransactionMixin) {
  @getter.demeterFarming.farmingPools farmingPools!: DoubleMap<DemeterPool[]>;
  @getter.demeterFarming.stakingPools stakingPools!: DoubleMap<DemeterPool[]>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: DoubleMap<DemeterAccountPool[]>;
  @getter.demeterFarming.accountStakingPools accountStakingPools!: DoubleMap<DemeterAccountPool[]>;

  @action.demeterFarming.deposit deposit!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.withdraw withdraw!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.claimRewards private claimRewards!: (pool: DemeterAccountPool) => Promise<void>;

  // override it for Staking page
  isFarmingPage = true;

  showStakeDialog = false;
  showClaimDialog = false;
  showCalculatorDialog = false;

  baseAsset: Nullable<string> = null;
  poolAsset: Nullable<string> = null;
  rewardAsset: Nullable<string> = null;

  isAddingStake = true;

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

  getAvailablePools(pools: DemeterPool[]): Array<{ pool: DemeterPool; accountPool: Nullable<DemeterAccountPool> }> {
    if (!Array.isArray(pools)) return [];

    return pools.reduce<{ pool: DemeterPool; accountPool: Nullable<DemeterAccountPool> }[]>((buffer, pool) => {
      const poolIsActive = !pool.isRemoved;
      const accountPool = this.getAccountPool(pool);
      const accountPoolIsActive = !!accountPool && this.isActiveAccountPool(accountPool);

      if (poolIsActive || accountPoolIsActive) {
        buffer.push({
          pool,
          accountPool,
        });
      }

      return buffer;
    }, []);
  }

  getAccountPool(pool: DemeterPool): Nullable<DemeterAccountPool> {
    return this.accountPools[pool.baseAsset]?.[pool.poolAsset]?.find(
      (accountPool) => accountPool.rewardAsset === pool.rewardAsset
    );
  }

  isActiveAccountPool(accountPool: DemeterAccountPool): boolean {
    return !accountPool.pooledTokens.isZero() || !accountPool.rewards.isZero();
  }

  getStatusBadgeVisibility(address: string, activeCollapseItems: string[]): boolean {
    return !activeCollapseItems.includes(address);
  }

  changePoolStake(params: { baseAsset: string; poolAsset: string; rewardAsset: string }, isAddingStake = true): void {
    this.isAddingStake = isAddingStake;
    this.setDialogParams(params);
    this.showStakeDialog = true;
  }

  claimPoolRewards(params: { baseAsset: string; poolAsset: string; rewardAsset: string }): void {
    this.setDialogParams(params);
    this.showClaimDialog = true;
  }

  showPoolCalculator(params: { baseAsset: string; poolAsset: string; rewardAsset: string }): void {
    this.setDialogParams(params);
    this.showCalculatorDialog = true;
  }

  private setDialogParams(params: { baseAsset: string; poolAsset: string; rewardAsset: string }): void {
    this.baseAsset = params.baseAsset;
    this.poolAsset = params.poolAsset;
    this.rewardAsset = params.rewardAsset;
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
