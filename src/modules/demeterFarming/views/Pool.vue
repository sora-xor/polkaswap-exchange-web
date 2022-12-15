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
            :base-asset="item.baseAsset"
            :pool-asset="item.poolAsset"
            :reward-asset="item.rewardAsset"
            :emission="item.emission"
            :tvl="item.tvl"
            :apr="item.apr"
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
          :base-asset="item.baseAsset"
          :pool-asset="item.poolAsset"
          :reward-asset="item.rewardAsset"
          :emission="item.emission"
          :tvl="item.tvl"
          :apr="item.apr"
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
      :parent-loading="parentLoading || loading"
      v-bind="selectedDerivedPool"
      @add="handleStakeAction($event, deposit)"
      @remove="handleStakeAction($event, withdraw)"
    />

    <claim-dialog
      :visible.sync="showClaimDialog"
      :parent-loading="parentLoading || loading"
      v-bind="selectedDerivedPool"
      @confirm="handleClaimRewards"
    />

    <calculator-dialog
      :visible.sync="showCalculatorDialog"
      :liquidity="selectedAccountLiquidity"
      v-bind="selectedDerivedPool"
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
import type { DemeterPoolDerivedData } from '@/modules/demeterFarming/types';

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

  get selectedDerivedPool(): DemeterPoolDerivedData | object {
    if (!this.selectedPool) return {};

    return this.prepareDerivedPoolData(
      {
        pool: this.selectedPool,
        accountPool: this.selectedAccountPool,
      },
      this.selectedAccountLiquidity
    );
  }

  get farmingPoolsByLiquidities(): Record<string, DemeterPoolDerivedData[]> {
    return this.accountLiquidity.reduce((buffer, liquidity) => {
      const key = this.getLiquidityKey(liquidity);
      const availablePools = this.getAvailablePools(this.pools[liquidity.firstAddress]?.[liquidity.secondAddress]);

      buffer[key] = availablePools.map((derived) => this.prepareDerivedPoolData(derived, liquidity));

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
