<template>
  <div>
    <pool-base v-bind="{ parentLoading, ...$attrs }" v-on="$listeners">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <div v-show="!isActiveCollapseItem(liquidity.address, activeCollapseItems)" class="s-flex farming-pool-badges">
          <status-badge
            v-for="(item, index) in getLiquidityFarmingPools(liquidity)"
            :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`"
            :liquidity="liquidity"
            :pool="item.pool"
            :account-pool="item.accountPool"
            :pool-asset="item.poolAsset"
            :reward-asset="item.rewardAsset"
            :apr="item.apr"
            @add="changePoolStake($event, true)"
            class="farming-pool-badge"
          />
        </div>
      </template>
      <template #append="{ liquidity, activeCollapseItems }">
        <template v-if="isActiveCollapseItem(liquidity.address, activeCollapseItems)">
          <pool-card
            v-for="(item, index) in getLiquidityFarmingPools(liquidity)"
            :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`"
            :liquidity="liquidity"
            :pool="item.pool"
            :account-pool="item.accountPool"
            :base-asset="item.baseAsset"
            :pool-asset="item.poolAsset"
            :reward-asset="item.rewardAsset"
            :apr="item.apr"
            :tvl="item.tvl"
            @add="changePoolStake($event, true)"
            @remove="changePoolStake($event, false)"
            @claim="claimPoolRewards"
            @calculator="showPoolCalculator"
            border
            class="demeter-pool"
          />
        </template>
      </template>
    </pool-base>

    <stake-dialog
      :visible.sync="showStakeDialog"
      :is-adding="isAddingStake"
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
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { PoolPageNames } from '@/modules/pool/consts';
import { poolLazyView } from '@/modules/pool/router';
import type { DemeterPoolDerivedData } from '@/modules/staking/demeter/types';
import { state } from '@/store/decorators';

import { demeterStakingLazyComponent } from '../../router';
import { DemeterStakingComponents } from '../consts';
import PageMixin from '../mixins/PageMixin';

import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

@Component({
  inheritAttrs: false,
  components: {
    PoolBase: poolLazyView(PoolPageNames.Pool),
    PoolCard: demeterStakingLazyComponent(DemeterStakingComponents.PoolCard),
    StatusBadge: demeterStakingLazyComponent(DemeterStakingComponents.StatusBadge),
    StakeDialog: demeterStakingLazyComponent(DemeterStakingComponents.StakeDialog),
    ClaimDialog: demeterStakingLazyComponent(DemeterStakingComponents.ClaimDialog),
    CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog),
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

  get selectedDerivedPool(): Nullable<DemeterPoolDerivedData> {
    if (!this.selectedPool) return null;

    return this.prepareDerivedPoolData(this.selectedPool, this.selectedAccountPool, this.selectedAccountLiquidity);
  }

  get farmingPoolsByLiquidities(): Record<string, DemeterPoolDerivedData[]> {
    return this.accountLiquidity.reduce((buffer, liquidity) => {
      const key = this.getLiquidityKey(liquidity);
      const derivedPools = this.getDerivedPools(this.pools[liquidity.firstAddress]?.[liquidity.secondAddress]);

      buffer[key] = derivedPools.map((derived) =>
        this.prepareDerivedPoolData(derived.pool, derived.accountPool, liquidity)
      );

      return buffer;
    }, {});
  }

  getLiquidityFarmingPools(liquidity: AccountLiquidity) {
    return this.farmingPoolsByLiquidities[this.getLiquidityKey(liquidity)] ?? [];
  }

  private getLiquidityKey(liquidity: AccountLiquidity): string {
    return [liquidity.firstAddress, liquidity.secondAddress].join(';');
  }
}
</script>

<style lang="scss" scoped>
.farming-pool-badges {
  flex-flow: wrap;
  gap: $inner-spacing-tiny;
}
.demeter-pool {
  margin-top: $inner-spacing-medium;
}
</style>
