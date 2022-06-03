<template>
  <div>
    <pool-base v-bind="{ parentLoading, ...$attrs }" v-on="$listeners">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <pool-status-badge
          v-if="poolStatusBadgeVisible(liquidity, activeCollapseItems)"
          :active="hasActiveFarmingPools(liquidity)"
          :has-stake="!!accountFarmingPoolsForLiquidity(liquidity).length"
          class="farming-pool-badge"
        />
      </template>
      <template #append="liquidity">
        <pool-card
          v-for="pool in farmingPools[liquidity.secondAddress]"
          :key="`${pool.poolAsset}-${pool.rewardAsset}`"
          :liquidity="liquidity"
          :pool="pool"
          :account-pool="accountFarmingPool(pool)"
          @add="changePoolStake($event, true)"
          @remove="changePoolStake($event, false)"
          @claim="claimPoolRewards"
          class="demeter-pool"
        />
      </template>
    </pool-base>

    <stake-dialog
      :visible.sync="showStakeDialog"
      :liquidity="selectedAccountLiquidity"
      :pool="selectedFarmingPool"
      :account-pool="selectedAccountFarmingPool"
      :is-adding="isAddingStake"
      @add="handleStakeAction($event, depositLiquidity)"
      @remove="handleStakeAction($event, withdrawLiquidity)"
    />
    <claim-dialog
      :visible.sync="showClaimDialog"
      :pool="selectedFarmingPool"
      :account-pool="selectedAccountFarmingPool"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { lazyView, lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { action, state, getter } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

@Component({
  inheritAttrs: false,
  components: {
    PoolBase: lazyView(PageNames.Pool),
    PoolCard: lazyComponent(Components.PoolCard),
    PoolStatusBadge: lazyComponent(Components.PoolStatusBadge),
    StakeDialog: lazyComponent(Components.DemeterStakeDialog),
    ClaimDialog: lazyComponent(Components.DemeterClaimDialog),
  },
})
export default class DemeterPools extends Mixins(mixins.TransactionMixin) {
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  @getter.demeterFarming.farmingPools farmingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: Array<DemeterAccountPool>;

  @action.demeterFarming.depositLiquidity depositLiquidity!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.withdrawLiquidity withdrawLiquidity!: (params: DemeterLiquidityParams) => Promise<void>;

  showStakeDialog = false;
  showClaimDialog = false;

  poolAsset: Nullable<string> = null;
  rewardAsset: Nullable<string> = null;

  isAddingStake = true;

  get selectedAccountFarmingPool(): Nullable<DemeterAccountPool> {
    const { poolAsset, rewardAsset } = this;

    return poolAsset && rewardAsset ? this.accountFarmingPool({ poolAsset, rewardAsset } as DemeterPool) ?? null : null;
  }

  get selectedFarmingPool(): Nullable<DemeterPool> {
    if (!this.poolAsset || !this.farmingPools[this.poolAsset]) return null;

    return this.farmingPools[this.poolAsset].find((pool) => pool.rewardAsset === this.rewardAsset);
  }

  get selectedAccountLiquidity(): Nullable<AccountLiquidity> {
    return this.accountLiquidity.find((liquidity) => liquidity.secondAddress === this.poolAsset) ?? null;
  }

  poolStatusBadgeVisible(liquidity: AccountLiquidity, activeCollapseItems: string[]): boolean {
    const isClosedCollapseItem = !activeCollapseItems.includes(liquidity.address);
    const hasActiveFarmingPools = this.hasActiveFarmingPools(liquidity);
    const hasAccountFarmingPools = !!this.accountFarmingPoolsForLiquidity(liquidity).length;

    return isClosedCollapseItem && (hasActiveFarmingPools || hasAccountFarmingPools);
  }

  hasActiveFarmingPools(liquidity: AccountLiquidity): boolean {
    return this.farmingPools[liquidity.secondAddress]?.some((pool) => !pool.isRemoved);
  }

  accountFarmingPoolsForLiquidity(liquidity: AccountLiquidity): Array<DemeterAccountPool> {
    return this.accountFarmingPools.filter(
      (accountPool) =>
        accountPool.poolAsset === liquidity.secondAddress &&
        (!accountPool.pooledTokens.isZero() || !accountPool.rewards.isZero)
    );
  }

  accountFarmingPool(farmingPool: DemeterPool): Nullable<DemeterAccountPool> {
    return this.accountFarmingPools.find(
      (accountPool) =>
        accountPool.poolAsset === farmingPool.poolAsset && accountPool.rewardAsset === farmingPool.rewardAsset
    );
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
}
</script>

<style lang="scss" scoped>
.farming-pool-badge {
  margin-right: $inner-spacing-medium;
}
.demeter-pool {
  margin-top: $inner-spacing-medium;
}
</style>
