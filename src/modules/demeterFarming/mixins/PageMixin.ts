import { Component, Mixins } from 'vue-property-decorator';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';

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
  showCalculatorDialog = false;

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
    return this.accountPools[pool.poolAsset]?.find((accountPool) => accountPool.rewardAsset === pool.rewardAsset);
  }

  hasActivePools(address: string): boolean {
    return this.pools[address]?.some((pool) => !pool.isRemoved);
  }

  hasAccountPoolsForPoolAsset(address: string): boolean {
    return this.accountPools[address]?.some((accountPool) => this.isActiveAccountPool(accountPool));
  }

  isActiveAccountPool(accountPool: DemeterAccountPool): boolean {
    return !accountPool.pooledTokens.isZero() || !accountPool.rewards.isZero();
  }

  getStatusBadgeVisibility(address: string, activeCollapseItems: string[]): boolean {
    return !activeCollapseItems.includes(address);
  }

  changePoolStake(params: { poolAsset: string; rewardAsset: string }, isAddingStake = true): void {
    this.isAddingStake = isAddingStake;
    this.setDialogParams(params);
    this.showStakeDialog = true;
  }

  claimPoolRewards(params: { poolAsset: string; rewardAsset: string }): void {
    this.setDialogParams(params);
    this.showClaimDialog = true;
  }

  showPoolCalculator(params: { poolAsset: string; rewardAsset: string }): void {
    this.setDialogParams(params);
    this.showCalculatorDialog = true;
  }

  private setDialogParams({ poolAsset, rewardAsset }: { poolAsset: string; rewardAsset: string }): void {
    this.poolAsset = poolAsset;
    this.rewardAsset = rewardAsset;
  }

  async handleStakeAction(
    params: DemeterLiquidityParams,
    action: (params: DemeterLiquidityParams) => Promise<void>,
    isTransactionSigned: () => Promise<boolean>
  ): Promise<void> {
    this.showStakeDialog = false;

    if (!(await isTransactionSigned())) return;

    await this.withNotifications(async () => {
      await action(params);
      api.lockPair();
    });
  }

  async handleClaimRewards(pool: DemeterAccountPool, isTransactionSigned: () => Promise<boolean>): Promise<void> {
    this.showClaimDialog = false;

    if (!(await isTransactionSigned())) return;

    await this.withNotifications(async () => {
      await this.claimRewards(pool);
      api.lockPair();
    });
  }
}
