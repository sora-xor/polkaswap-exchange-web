import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { action } from '@/store/decorators';

import BasePageMixin from './BasePageMixin';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';
@Component
export default class PageMixin extends Mixins(BasePageMixin, mixins.TransactionMixin) {
  @action.demeterFarming.deposit deposit!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.withdraw withdraw!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.claimRewards private claimRewards!: (pool: DemeterAccountPool) => Promise<void>;

  showStakeDialog = false;
  showClaimDialog = false;
  isAddingStake = true;

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

  private isActiveAccountPool(accountPool: DemeterAccountPool): boolean {
    return !accountPool.pooledTokens.isZero() || !accountPool.rewards.isZero();
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
