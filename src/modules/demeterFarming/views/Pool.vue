<template>
  <div>
    <pool-base v-bind="{ parentLoading, ...$attrs }" v-on="$listeners">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <div
          v-show="getStatusBadgeVisibility(liquidity.address, activeCollapseItems)"
          class="s-flex farming-pool-badges"
        >
          <status-badge
            v-for="(item, index) in getLiquidityFarmingPools(liquidity)"
            :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`"
            :liquidity="liquidity"
            :pool="item.pool"
            :account-pool="item.accountPool"
            @add="changePoolStake($event, true)"
            class="farming-pool-badge"
          />
        </div>
      </template>
      <template #append="liquidity">
        <pool-card
          v-for="(item, index) in getLiquidityFarmingPools(liquidity)"
          :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`"
          :liquidity="liquidity"
          :pool="item.pool"
          :account-pool="item.accountPool"
          @add="changePoolStake($event, true)"
          @remove="changePoolStake($event, false)"
          @claim="claimPoolRewards"
          @calculator="showPoolCalculator"
          border
          class="demeter-pool"
        />
      </template>
    </pool-base>

    <stake-dialog
      :visible.sync="showStakeDialog"
      :liquidity="selectedAccountLiquidity"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :is-adding="isAddingStake"
      :parent-loading="parentLoading || loading"
      @add="handleStakeAction($event, deposit)"
      @remove="handleStakeAction($event, withdraw)"
    />
    <claim-dialog
      :visible.sync="showClaimDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :parent-loading="parentLoading || loading"
      @confirm="handleClaimRewards"
    />

    <calculator-dialog
      :visible.sync="showCalculatorDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :liquidity="selectedAccountLiquidity"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import PageMixin from '../mixins/PageMixin';

import { demeterLazyComponent } from '../router';
import { DemeterComponents } from '../consts';

import { lazyView } from '@/router';
import { PageNames } from '@/consts';

import { state } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

@Component({
  inheritAttrs: false,
  components: {
    PoolBase: lazyView(PageNames.Pool),
    PoolCard: demeterLazyComponent(DemeterComponents.PoolCard),
    StatusBadge: demeterLazyComponent(DemeterComponents.StatusBadge),
    StakeDialog: demeterLazyComponent(DemeterComponents.StakeDialog),
    ClaimDialog: demeterLazyComponent(DemeterComponents.ClaimDialog),
    CalculatorDialog: demeterLazyComponent(DemeterComponents.CalculatorDialog),
  },
})
export default class DemeterPools extends Mixins(PageMixin, mixins.TransactionMixin) {
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  get selectedAccountLiquidity(): Nullable<AccountLiquidity> {
    return (
      this.accountLiquidity.find(
        (liquidity) => liquidity.firstAddress === this.baseAsset && liquidity.secondAddress === this.poolAsset
      ) ?? null
    );
  }

  get farmingPoolsByLiquidities(): Record<string, { pool: DemeterPool; accountPool: Nullable<DemeterAccountPool> }[]> {
    return this.accountLiquidity.reduce((buffer, liquidity) => {
      const key = this.getLiquidityKey(liquidity);

      buffer[key] = this.getAvailablePools(this.pools[liquidity.firstAddress]?.[liquidity.secondAddress]);

      return buffer;
    }, {});
  }

  getLiquidityFarmingPools(liquidity: AccountLiquidity) {
    return this.farmingPoolsByLiquidities[this.getLiquidityKey(liquidity)] ?? [];
  }

  getStatusBadgeVisibility(address: string, activeCollapseItems: string[]): boolean {
    return !activeCollapseItems.includes(address);
  }

  private getLiquidityKey(liquidity: AccountLiquidity): string {
    return [liquidity.firstAddress, liquidity.secondAddress].join(';');
  }
}
</script>

<style lang="scss" scoped>
.farming-pool-badges {
  flex-flow: wrap;
}
.demeter-pool {
  margin-top: $inner-spacing-medium;
}
</style>
