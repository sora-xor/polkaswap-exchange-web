<template>
  <pool-base v-bind="$attrs" v-on="$listeners">
    <template #title-append="liquidityInfo">
      <pool-status-badge
        v-if="farmingPoolsForLiquidity(liquidityInfo).length"
        :active="!!accountFarmingPoolsForLiquidity(liquidityInfo).length"
        class="farming-pool-badge"
      />
    </template>
    <template #append="liquidityInfo">
      <pool-card v-for="pool in farmingPoolsForLiquidity(liquidityInfo)" :key="pool.poolAsset" class="demeter-pool" />
    </template>
  </pool-base>
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
  },
})
export default class DemeterPools extends Mixins() {
  @getter.demeterFarming.farmingPools farmingPools!: Array<DemeterPool>;
  @getter.demeterFarming.accountFarmingPools accountFarmingPools!: Array<DemeterAccountPool>;

  farmingPoolsForLiquidity(liquidity: AccountLiquidity): Array<DemeterPool> {
    return this.farmingPools.filter((pool) => pool.poolAsset === liquidity.secondAddress);
  }

  accountFarmingPoolsForLiquidity(liquidity: AccountLiquidity): Array<DemeterAccountPool> {
    return this.accountFarmingPools.filter(
      (accountFarmingPool) => accountFarmingPool.poolAsset === liquidity.secondAddress
    );
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
