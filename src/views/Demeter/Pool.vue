<template>
  <div>
    <pool-base v-bind="$attrs" v-on="$listeners">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <pool-status-badge
          v-if="isClosedCollapseItem(liquidity, activeCollapseItems) && farmingPoolsForLiquidity(liquidity).length"
          :active="!!accountFarmingPoolsForLiquidity(liquidity).length"
          class="farming-pool-badge"
        />
      </template>
      <template #append="liquidity">
        <pool-card
          v-for="pool in farmingPoolsForLiquidity(liquidity)"
          :key="pool.poolAsset"
          :liquidity="liquidity"
          :pool="pool"
          :account-pool="accountFarmingPool(pool)"
          @add="addPoolStake"
          @remove="removePoolStake"
          @claim="claimPoolRewards"
          class="demeter-pool"
        />
      </template>
    </pool-base>

    <stake-dialog :visible.sync="showStakeDialog" />
    <claim-dialog :visible.sync="showClaimDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import router, { lazyView, lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { state, getter } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterAccountPool } from '@/store/demeterFarming/types';

@Component({
  components: {
    PoolBase: lazyView(PageNames.Pool),
    PoolCard: lazyComponent(Components.PoolCard),
    PoolStatusBadge: lazyComponent(Components.PoolStatusBadge),
    StakeDialog: lazyComponent(Components.DemeterStakeDialog),
    ClaimDialog: lazyComponent(Components.DemeterClaimDialog),
  },
})
export default class DemeterPools extends Mixins() {
  @getter.demeterFarming.farmingPools farmingPools!: Array<DemeterPool>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: Array<DemeterAccountPool>;

  showStakeDialog = false;
  showClaimDialog = false;

  farmingPoolsForLiquidity(liquidity: AccountLiquidity): Array<DemeterPool> {
    return this.farmingPools.filter((pool) => pool.poolAsset === liquidity.secondAddress);
  }

  accountFarmingPoolsForLiquidity(liquidity: AccountLiquidity): Array<DemeterAccountPool> {
    return this.accountFarmingPools.filter((accountPool) => accountPool.poolAsset === liquidity.secondAddress);
  }

  accountFarmingPool(farmingPool: DemeterPool): Nullable<DemeterAccountPool> {
    return this.accountFarmingPools.find(
      (accountPool) =>
        accountPool.poolAsset === farmingPool.poolAsset && accountPool.rewardAsset === farmingPool.rewardAsset
    );
  }

  isClosedCollapseItem(liquidity: AccountLiquidity, activeCollapseItems: string[]): boolean {
    return !!liquidity && !activeCollapseItems.includes(liquidity.address);
  }

  addPoolStake() {
    this.showStakeDialog = true;
  }

  removePoolStake() {
    this.showStakeDialog = true;
  }

  claimPoolRewards() {
    this.showClaimDialog = true;
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
